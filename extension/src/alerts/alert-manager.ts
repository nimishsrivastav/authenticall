/**
 * Alert Manager
 * Manages alert generation, deduplication, rate limiting, and lifecycle
 */

import { Alert, AlertSeverity, AlertCategory } from '../shared/types';
import {
  AlertConfig,
  AlertTrigger,
  AlertGenerationResult,
  DeduplicationKey,
  AlertStats,
  DEFAULT_ALERT_CONFIG,
} from './types';
import { SeverityClassifier } from './severity-classifier';
import { NotificationService, getNotificationService } from './notification-service';

export class AlertManager {
  private config: AlertConfig;
  private severityClassifier: SeverityClassifier;
  private notificationService: NotificationService;

  private activeAlerts: Map<string, Alert> = new Map();
  private dismissedAlerts: Map<string, Alert> = new Map();
  private recentAlertHashes: Map<string, number> = new Map(); // hash -> timestamp
  private alertTimestamps: number[] = []; // for rate limiting
  private alertTypeTimestamps: Map<string, number[]> = new Map();

  private listeners: Set<(alert: Alert, action: 'created' | 'dismissed' | 'expired') => void> = new Set();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(
    config: AlertConfig = DEFAULT_ALERT_CONFIG,
    notificationService?: NotificationService,
  ) {
    this.config = config;
    this.severityClassifier = new SeverityClassifier();
    this.notificationService = notificationService ?? getNotificationService();

    this.startCleanup();
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Stop automatic cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Generate an alert from trigger
   */
  public async generateAlert(
    trigger: AlertTrigger,
    title: string,
    message: string,
    details?: string,
  ): Promise<AlertGenerationResult> {
    // Check if alerts are enabled
    if (!this.config.enabled) {
      return {
        alert: null,
        suppressed: true,
        reason: 'Alerts disabled',
      };
    }

    // Check rate limit
    if (!this.checkRateLimit(trigger.source)) {
      return {
        alert: null,
        suppressed: true,
        reason: 'Rate limit exceeded',
      };
    }

    // Check for duplicate
    const deduplicationKey = this.generateDeduplicationKey(
      trigger.source as AlertCategory,
      title,
      message,
    );
    if (this.isDuplicate(deduplicationKey)) {
      return {
        alert: null,
        suppressed: true,
        reason: 'Duplicate alert within deduplication window',
      };
    }

    // Classify severity
    const severityInput: any = {
      trustScore: trigger.score ?? 50,
      confidence: trigger.confidence ?? 0.5,
      indicators:
        trigger.indicators?.map((i) => ({ type: i, severity: 'medium' })) ?? [],
      isAnomaly: trigger.source === 'anomaly',
      category: trigger.source as AlertCategory,
    };

    if (trigger.source === 'anomaly') {
      severityInput.anomalyType = 'sudden_drop';
    }

    const classification = this.severityClassifier.classify(severityInput);

    // Create alert
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: trigger.timestamp,
      severity: classification.severity,
      category: trigger.source as AlertCategory,
      title,
      message,
      actionRequired: classification.actionRequired,
      dismissed: false,
    };

    if (details !== undefined) {
      alert.details = details;
    }

    // Check max active alerts
    if (this.activeAlerts.size >= this.config.maxActiveAlerts) {
      this.dismissOldestAlert();
    }

    // Add to active alerts
    this.activeAlerts.set(alert.id, alert);

    // Update tracking
    this.recentAlertHashes.set(deduplicationKey.hash, Date.now());
    this.alertTimestamps.push(Date.now());

    const typeTimestamps = this.alertTypeTimestamps.get(alert.category) ?? [];
    typeTimestamps.push(Date.now());
    this.alertTypeTimestamps.set(alert.category, typeTimestamps);

    // Notify listeners
    this.notifyListeners(alert, 'created');

    // Show notification
    if (
      this.severityClassifier.compareSeverity(
        alert.severity,
        this.config.minSeverityForNotification,
      ) >= 0
    ) {
      await this.notificationService.show(alert, (action) => {
        if (action === 'dismiss') {
          this.dismissAlert(alert.id);
        }
      });
    }

    return {
      alert,
      suppressed: false,
    };
  }

  /**
   * Generate alert directly with severity
   */
  public async createAlert(
    category: AlertCategory,
    severity: AlertSeverity,
    title: string,
    message: string,
    options: {
      details?: string;
      actionRequired?: boolean;
      showNotification?: boolean;
    } = {},
  ): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      severity,
      category,
      title,
      message,
      actionRequired: options.actionRequired ?? false,
      dismissed: false,
    };

    if (options.details !== undefined) {
      alert.details = options.details;
    }

    // Add to active alerts
    this.activeAlerts.set(alert.id, alert);

    // Notify listeners
    this.notifyListeners(alert, 'created');

    // Show notification if requested
    if (options.showNotification !== false) {
      await this.notificationService.show(alert);
    }

    return alert;
  }

  /**
   * Dismiss an alert
   */
  public dismissAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.dismissed = true;
    this.activeAlerts.delete(alertId);
    this.dismissedAlerts.set(alertId, alert);

    // Clear notification
    this.notificationService.clear(alertId);

    // Notify listeners
    this.notifyListeners(alert, 'dismissed');

    return true;
  }

  /**
   * Dismiss all alerts
   */
  public dismissAllAlerts(): number {
    let count = 0;
    for (const alertId of this.activeAlerts.keys()) {
      if (this.dismissAlert(alertId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Dismiss oldest alert
   */
  private dismissOldestAlert(): void {
    let oldest: Alert | null = null;

    for (const alert of this.activeAlerts.values()) {
      if (!oldest || alert.timestamp < oldest.timestamp) {
        oldest = alert;
      }
    }

    if (oldest) {
      this.dismissAlert(oldest.id);
    }
  }

  /**
   * Get alert by ID
   */
  public getAlert(alertId: string): Alert | null {
    return this.activeAlerts.get(alertId) ?? this.dismissedAlerts.get(alertId) ?? null;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alerts by severity
   */
  public getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(
      (a) => a.severity === severity,
    );
  }

  /**
   * Get alerts by category
   */
  public getAlertsByCategory(category: AlertCategory): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(
      (a) => a.category === category,
    );
  }

  /**
   * Get alerts requiring action
   */
  public getActionRequiredAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(
      (a) => a.actionRequired,
    );
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(source: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.alertTimestamps = this.alertTimestamps.filter((t) => t > oneMinuteAgo);

    // Check global rate limit
    if (this.alertTimestamps.length >= this.config.rateLimit.maxPerMinute) {
      console.log('[AlertManager] Global rate limit exceeded');
      return false;
    }

    // Check per-type rate limit
    const typeTimestamps = this.alertTypeTimestamps.get(source) ?? [];
    const recentTypeTimestamps = typeTimestamps.filter((t) => t > oneMinuteAgo);
    this.alertTypeTimestamps.set(source, recentTypeTimestamps);

    if (recentTypeTimestamps.length >= this.config.rateLimit.maxPerType) {
      console.log(`[AlertManager] Type rate limit exceeded for ${source}`);
      return false;
    }

    return true;
  }

  /**
   * Generate deduplication key
   */
  private generateDeduplicationKey(
    category: AlertCategory,
    title: string,
    message: string,
  ): DeduplicationKey {
    const hash = this.simpleHash(`${category}:${title}:${message}`);
    return { category, title, hash };
  }

  /**
   * Check if alert is duplicate
   */
  private isDuplicate(key: DeduplicationKey): boolean {
    const lastTime = this.recentAlertHashes.get(key.hash);
    if (!lastTime) {
      return false;
    }

    return Date.now() - lastTime < this.config.deduplicationWindow;
  }

  /**
   * Simple string hash
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleanup old alerts and data
   */
  public cleanup(): void {
    const now = Date.now();

    // Clean old deduplication hashes
    for (const [hash, timestamp] of this.recentAlertHashes.entries()) {
      if (now - timestamp > this.config.deduplicationWindow * 2) {
        this.recentAlertHashes.delete(hash);
      }
    }

    // Auto-dismiss old alerts
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (now - alert.timestamp > this.config.autoCleanupAge) {
        this.dismissAlert(id);
        console.log(`[AlertManager] Auto-dismissed old alert: ${id}`);
      }
    }

    // Trim dismissed alerts history
    if (this.dismissedAlerts.size > 100) {
      const entries = Array.from(this.dismissedAlerts.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.dismissedAlerts = new Map(entries.slice(0, 50));
    }
  }

  /**
   * Get alert statistics
   */
  public getStats(): AlertStats {
    const active = Array.from(this.activeAlerts.values());
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const byCategory: Record<AlertCategory, number> = {
      visual: 0,
      behavioral: 0,
      audio: 0,
      fusion: 0,
    };

    const bySeverity: Record<AlertSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const alert of active) {
      byCategory[alert.category]++;
      bySeverity[alert.severity]++;
    }

    const recentTimestamps = this.alertTimestamps.filter((t) => t > oneMinuteAgo);

    return {
      total: this.activeAlerts.size + this.dismissedAlerts.size,
      active: this.activeAlerts.size,
      dismissed: this.dismissedAlerts.size,
      byCategory,
      bySeverity,
      lastAlertTime: active.length > 0
        ? Math.max(...active.map((a) => a.timestamp))
        : null,
      alertsPerMinute: recentTimestamps.length,
    };
  }

  /**
   * Add listener
   */
  public addListener(
    callback: (alert: Alert, action: 'created' | 'dismissed' | 'expired') => void,
  ): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(
    alert: Alert,
    action: 'created' | 'dismissed' | 'expired',
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(alert, action);
      } catch (error) {
        console.error('[AlertManager] Listener error:', error);
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable alerts
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if alerts are enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Clear all data
   */
  public clearAll(): void {
    this.activeAlerts.clear();
    this.dismissedAlerts.clear();
    this.recentAlertHashes.clear();
    this.alertTimestamps = [];
    this.alertTypeTimestamps.clear();
    this.notificationService.clearAll();
  }

  /**
   * Get most severe active alert
   */
  public getMostSevereAlert(): Alert | null {
    const active = Array.from(this.activeAlerts.values());
    if (active.length === 0) {
      return null;
    }

    return active.reduce((most, current) => {
      if (this.severityClassifier.compareSeverity(current.severity, most.severity) > 0) {
        return current;
      }
      return most;
    });
  }

  /**
   * Get severity classifier
   */
  public getSeverityClassifier(): SeverityClassifier {
    return this.severityClassifier;
  }
}

// Singleton instance
let alertManagerInstance: AlertManager | null = null;

/**
 * Get or create alert manager instance
 */
export function getAlertManager(): AlertManager {
  if (!alertManagerInstance) {
    alertManagerInstance = new AlertManager();
  }
  return alertManagerInstance;
}
