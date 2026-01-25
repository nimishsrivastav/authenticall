/**
 * Notification Service
 * Manages Chrome notifications for alerts
 */

import { Alert, AlertSeverity } from '../shared/types';
import {
  NotificationConfig,
  NotificationResult,
  DEFAULT_NOTIFICATION_CONFIG,
} from './types';

export class NotificationService {
  private config: NotificationConfig;
  private activeNotifications: Map<string, string> = new Map(); // alertId -> notificationId
  private clickHandlers: Map<string, (action?: string) => void> = new Map();

  constructor(config: NotificationConfig = DEFAULT_NOTIFICATION_CONFIG) {
    this.config = config;
    this.setupListeners();
  }

  /**
   * Set up Chrome notification listeners
   */
  private setupListeners(): void {
    // Handle notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });

    // Handle button clicks
    chrome.notifications.onButtonClicked.addListener(
      (notificationId, buttonIndex) => {
        this.handleButtonClick(notificationId, buttonIndex);
      },
    );

    // Handle notification closed
    chrome.notifications.onClosed.addListener((notificationId) => {
      this.handleNotificationClosed(notificationId);
    });
  }

  /**
   * Show notification for an alert
   */
  public async show(
    alert: Alert,
    onClick?: (action?: string) => void,
  ): Promise<NotificationResult> {
    // Check if notifications are enabled
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Notifications disabled',
      };
    }

    // Check severity threshold
    if (!this.shouldShowNotification(alert.severity)) {
      return {
        success: false,
        error: `Severity ${alert.severity} below threshold ${this.config.minSeverity}`,
      };
    }

    try {
      const notificationOptions = this.buildNotificationOptions(alert);
      const notificationId = await this.createNotification(
        alert.id,
        notificationOptions,
      );

      // Store mapping and handler
      this.activeNotifications.set(alert.id, notificationId);
      if (onClick) {
        this.clickHandlers.set(notificationId, onClick);
      }

      return {
        success: true,
        notificationId,
      };
    } catch (error) {
      console.error('[NotificationService] Failed to show notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build Chrome notification options
   */
  private buildNotificationOptions(
    alert: Alert,
  ): chrome.notifications.NotificationOptions {
    const options: chrome.notifications.NotificationOptions = {
      type: 'basic',
      iconUrl: this.config.iconPath,
      title: this.formatTitle(alert),
      message: alert.message,
      priority: this.getPriority(alert.severity),
      requireInteraction:
        this.config.requireInteraction && alert.actionRequired,
      silent: !this.config.soundEnabled,
    };

    // Add contextual message if available
    if (this.config.showPreview && alert.details) {
      options.contextMessage = alert.details;
    }

    // Add action buttons if enabled
    if (this.config.buttons && alert.actionRequired) {
      const buttons = this.getButtons(alert);
      if (buttons) {
        options.buttons = buttons;
      }
    }

    return options;
  }

  /**
   * Format notification title
   */
  private formatTitle(alert: Alert): string {
    const severityIcon = this.getSeverityIcon(alert.severity);
    return `${severityIcon} ${alert.title}`;
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  /**
   * Get notification priority
   */
  private getPriority(severity: AlertSeverity): 0 | 1 | 2 {
    switch (severity) {
      case 'critical':
        return 2;
      case 'high':
        return 2;
      case 'medium':
        return 1;
      case 'low':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get action buttons for notification
   */
  private getButtons(alert: Alert): any[] | undefined {
    if (alert.severity === 'critical' || alert.severity === 'high') {
      return [
        { title: 'View Details' },
        { title: 'Dismiss' },
      ];
    }

    return [{ title: 'Dismiss' }];
  }

  /**
   * Create Chrome notification
   */
  private createNotification(
    alertId: string,
    options: chrome.notifications.NotificationOptions,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.notifications.create(alertId, options as chrome.notifications.NotificationCreateOptions, (notificationId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(notificationId);
        }
      });
    });
  }

  /**
   * Clear notification
   */
  public async clear(alertId: string): Promise<boolean> {
    const notificationId = this.activeNotifications.get(alertId);
    if (!notificationId) {
      return false;
    }

    return new Promise((resolve) => {
      chrome.notifications.clear(notificationId, (wasCleared) => {
        if (wasCleared) {
          this.activeNotifications.delete(alertId);
          this.clickHandlers.delete(notificationId);
        }
        resolve(wasCleared);
      });
    });
  }

  /**
   * Clear all notifications
   */
  public async clearAll(): Promise<void> {
    const clearPromises = Array.from(this.activeNotifications.keys()).map(
      (alertId) => this.clear(alertId),
    );
    await Promise.all(clearPromises);
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(notificationId: string): void {
    const handler = this.clickHandlers.get(notificationId);
    if (handler) {
      handler('click');
    }

    // Open popup or focus extension
    this.focusExtension();
  }

  /**
   * Handle button click
   */
  private handleButtonClick(
    notificationId: string,
    buttonIndex: number,
  ): void {
    const handler = this.clickHandlers.get(notificationId);

    if (buttonIndex === 0) {
      // First button - usually "View Details"
      if (handler) {
        handler('view');
      }
      this.focusExtension();
    } else if (buttonIndex === 1) {
      // Second button - usually "Dismiss"
      if (handler) {
        handler('dismiss');
      }
      // Find and clear the notification
      for (const [alertId, nId] of this.activeNotifications.entries()) {
        if (nId === notificationId) {
          this.clear(alertId);
          break;
        }
      }
    }
  }

  /**
   * Handle notification closed
   */
  private handleNotificationClosed(notificationId: string): void {
    // Clean up mappings
    for (const [alertId, nId] of this.activeNotifications.entries()) {
      if (nId === notificationId) {
        this.activeNotifications.delete(alertId);
        break;
      }
    }
    this.clickHandlers.delete(notificationId);
  }

  /**
   * Focus extension popup
   */
  private focusExtension(): void {
    chrome.action.openPopup().catch(() => {
      // Popup might already be open or not available
      console.log('[NotificationService] Could not open popup');
    });
  }

  /**
   * Check if notification should be shown
   */
  private shouldShowNotification(severity: AlertSeverity): boolean {
    const severityOrder: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityOrder.indexOf(severity);
    const minIndex = severityOrder.indexOf(this.config.minSeverity);

    return currentIndex >= minIndex;
  }

  /**
   * Update notification for existing alert
   */
  public async update(
    alertId: string,
    updates: Partial<Pick<Alert, 'title' | 'message' | 'severity'>>,
  ): Promise<boolean> {
    const notificationId = this.activeNotifications.get(alertId);
    if (!notificationId) {
      return false;
    }

    const updateOptions: chrome.notifications.NotificationOptions = {};

    if (updates.title) {
      updateOptions.title = updates.title;
    }
    if (updates.message) {
      updateOptions.message = updates.message;
    }
    if (updates.severity) {
      updateOptions.priority = this.getPriority(updates.severity);
    }

    return new Promise((resolve) => {
      chrome.notifications.update(notificationId, updateOptions, (wasUpdated) => {
        resolve(wasUpdated);
      });
    });
  }

  /**
   * Get active notification count
   */
  public getActiveCount(): number {
    return this.activeNotifications.size;
  }

  /**
   * Check if alert has active notification
   */
  public hasNotification(alertId: string): boolean {
    return this.activeNotifications.has(alertId);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable notifications
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if notifications are enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Test notification system
   */
  public async test(): Promise<NotificationResult> {
    const testAlert: Alert = {
      id: `test-${Date.now()}`,
      timestamp: Date.now(),
      severity: 'medium',
      category: 'fusion',
      title: 'Test Notification',
      message: 'This is a test notification from Authenticall AI',
      actionRequired: false,
      dismissed: false,
    };

    const result = await this.show(testAlert);

    // Auto-clear after 5 seconds
    if (result.success) {
      setTimeout(() => {
        this.clear(testAlert.id);
      }, 5000);
    }

    return result;
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

/**
 * Get or create notification service instance
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}
