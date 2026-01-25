/**
 * Trust Scoring Service
 * Main orchestrator for Phase 5 Trust Scoring & Alert System
 * Coordinates scoring, storage, and alert components
 */

import {
  TrustScoreSnapshot,
  Alert,
  Platform,
  ExtensionSettings,
} from '../shared/types';
import {
  TrustScorer,
  AnalysisInput,
  TrustScoreResult,
  TrustScorerConfig,
} from '../scoring';
import {
  SessionStore,
  getSessionStore,
  HistoryManager,
  getHistoryManager,
  CacheManager,
  createCacheManager,
} from '../storage';
import {
  AlertManager,
  getAlertManager,
  NotificationService,
  getNotificationService,
} from '../alerts';
import { VisualAnalysisResult } from '../analysis/visual-analyzer';
import { BehavioralAnalysisResult } from '../analysis/behavioral-analyzer';
import { FusionAnalysisResult } from '../analysis/fusion-analyzer';

export interface TrustScoringServiceConfig {
  scorer?: TrustScorerConfig;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface AnalysisResultInput {
  visual?: VisualAnalysisResult;
  behavioral?: BehavioralAnalysisResult;
  fusion?: FusionAnalysisResult;
}

export class TrustScoringService {
  private trustScorer: TrustScorer;
  private sessionStore: SessionStore;
  private historyManager: HistoryManager;
  private alertManager: AlertManager;
  private notificationService: NotificationService;
  private analysisCache: CacheManager<TrustScoreResult>;

  private isInitialized: boolean = false;
  private listeners: Set<(score: TrustScoreSnapshot, alerts: Alert[]) => void> = new Set();

  constructor(config: TrustScoringServiceConfig = {}) {
    this.trustScorer = new TrustScorer(config.scorer);
    this.sessionStore = getSessionStore();
    this.historyManager = getHistoryManager();
    this.alertManager = getAlertManager();
    this.notificationService = getNotificationService();
    this.analysisCache = createCacheManager<TrustScoreResult>({
      defaultTTL: config.cacheTTL ?? 30000, // 30 seconds
      maxSize: 100,
    });
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[TrustScoringService] Initializing...');

    // Set up alert listener to store alerts in session
    this.alertManager.addListener((alert, action) => {
      if (action === 'created') {
        this.sessionStore.addAlert(alert);
        this.historyManager.addAlert(
          this.trustScorer.getSessionId() ?? 'unknown',
          alert,
        );
      }
    });

    this.isInitialized = true;
    console.log('[TrustScoringService] Initialized');
  }

  /**
   * Start a monitoring session
   */
  public async startSession(
    platform: Platform,
    url: string,
    participantCount: number = 1,
  ): Promise<void> {
    console.log(`[TrustScoringService] Starting session for ${platform}`);

    // Start session in store
    const session = await this.sessionStore.startSession(
      platform,
      url,
      participantCount,
    );

    // Start scoring session
    this.trustScorer.startSession(session.info.id);

    // Clear cache for new session
    this.analysisCache.clear();
  }

  /**
   * End the current session
   */
  public async endSession(): Promise<void> {
    console.log('[TrustScoringService] Ending session');

    // End scoring session
    this.trustScorer.endSession();

    // Get and archive session
    const session = await this.sessionStore.endSession();
    if (session) {
      await this.historyManager.addSession(session);
    }

    // Clear cache
    this.analysisCache.clear();
  }

  /**
   * Process analysis results and generate trust score
   */
  public async processAnalysisResults(
    results: AnalysisResultInput,
  ): Promise<{
    score: TrustScoreSnapshot;
    alerts: Alert[];
  }> {
    // Build analysis input for scorer
    const input: AnalysisInput = {};

    if (results.visual) {
      input.visual = {
        score: results.visual.trustScore,
        confidence: results.visual.confidence,
      };
    }

    if (results.behavioral) {
      input.behavioral = {
        score: results.behavioral.trustScore,
        confidence: results.behavioral.confidence,
      };
    }

    // Calculate contextual score based on trends
    const stats = this.trustScorer.getStatistics();
    if (stats.count > 0) {
      // Use trend to influence contextual score
      let contextual = 75; // neutral
      if (stats.trend === 'improving') {
        contextual = 85;
      } else if (stats.trend === 'declining') {
        contextual = 60;
      }
      input.contextual = contextual;
    }

    // Calculate trust score
    const scoreResult = this.trustScorer.calculateScore(input);

    // Convert to TrustScoreSnapshot
    const scoreSnapshot: TrustScoreSnapshot = {
      timestamp: scoreResult.timestamp,
      overall: scoreResult.overall,
      visual: scoreResult.components.visual >= 0 ? scoreResult.components.visual : 0,
      behavioral: scoreResult.components.behavioral >= 0 ? scoreResult.components.behavioral : 0,
      audio: scoreResult.components.audio >= 0 ? scoreResult.components.audio : 0,
      confidence: scoreResult.confidence,
      level: scoreResult.level,
    };

    // Store score in session
    await this.sessionStore.addScore(scoreSnapshot);

    // Generate alerts from analysis
    const alerts = await this.generateAlerts(results, scoreResult);

    // Notify listeners
    this.notifyListeners(scoreSnapshot, alerts);

    return { score: scoreSnapshot, alerts };
  }

  /**
   * Generate alerts from analysis results
   */
  private async generateAlerts(
    results: AnalysisResultInput,
    scoreResult: TrustScoreResult,
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check for anomaly alert
    if (scoreResult.isAnomaly && scoreResult.anomalyReason) {
      const result = await this.alertManager.generateAlert(
        {
          source: 'anomaly',
          score: scoreResult.overall,
          confidence: scoreResult.confidence,
          timestamp: Date.now(),
        },
        'Anomaly Detected',
        scoreResult.anomalyReason,
      );
      if (result.alert) {
        alerts.push(result.alert);
      }
    }

    // Check for visual alerts
    if (results.visual) {
      for (const indicator of results.visual.indicators) {
        if (indicator.severity === 'high') {
          const result = await this.alertManager.generateAlert(
            {
              source: 'visual',
              score: results.visual.trustScore,
              confidence: results.visual.confidence,
              indicators: [indicator.type],
              timestamp: Date.now(),
            },
            `Visual Alert: ${indicator.type}`,
            indicator.description,
          );
          if (result.alert) {
            alerts.push(result.alert);
          }
        }
      }
    }

    // Check for behavioral alerts
    if (results.behavioral) {
      for (const indicator of results.behavioral.indicators) {
        if (
          indicator.severity === 'high' ||
          indicator.severity === 'critical' ||
          indicator.severity === 'medium'
        ) {
          const result = await this.alertManager.generateAlert(
            {
              source: 'behavioral',
              score: results.behavioral.trustScore,
              confidence: results.behavioral.confidence,
              indicators: [indicator.type],
              timestamp: Date.now(),
            },
            `Behavioral Alert: ${indicator.type}`,
            indicator.description,
          );
          if (result.alert) {
            alerts.push(result.alert);
          }
        }
      }

      // Check for high-risk intent
      if (
        results.behavioral.intent.riskLevel === 'high' ||
        results.behavioral.intent.riskLevel === 'critical'
      ) {
        const result = await this.alertManager.generateAlert(
          {
            source: 'behavioral',
            score: results.behavioral.trustScore,
            confidence: results.behavioral.confidence,
            timestamp: Date.now(),
          },
          'Suspicious Intent Detected',
          results.behavioral.intent.description,
          `Category: ${results.behavioral.intent.category}`,
        );
        if (result.alert) {
          alerts.push(result.alert);
        }
      }
    }

    // Check for critically low trust score
    if (scoreResult.overall < 30 && scoreResult.confidence > 0.6) {
      const result = await this.alertManager.generateAlert(
        {
          source: 'fusion',
          score: scoreResult.overall,
          confidence: scoreResult.confidence,
          timestamp: Date.now(),
        },
        'Critical: Very Low Trust Score',
        `Trust score is critically low at ${scoreResult.overall}/100. This call may be fraudulent.`,
        'Consider ending the call and verifying the caller through another channel.',
      );
      if (result.alert) {
        alerts.push(result.alert);
      }
    }

    return alerts;
  }

  /**
   * Get current trust score
   */
  public getCurrentScore(): TrustScoreSnapshot | null {
    const session = this.sessionStore.getCurrentSession();
    if (!session || session.scores.length === 0) {
      return null;
    }
    return session.scores[session.scores.length - 1]!;
  }

  /**
   * Get score history for current session
   */
  public getScoreHistory(): TrustScoreSnapshot[] {
    return this.sessionStore.getScoreHistory();
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * Dismiss an alert
   */
  public dismissAlert(alertId: string): boolean {
    return this.alertManager.dismissAlert(alertId);
  }

  /**
   * Get session statistics
   */
  public getSessionStatistics(): {
    scoring: ReturnType<TrustScorer['getStatistics']>;
    alerts: ReturnType<AlertManager['getStats']>;
    session: ReturnType<SessionStore['getStatistics']>;
    baselineProgress: ReturnType<TrustScorer['getBaselineProgress']>;
  } {
    return {
      scoring: this.trustScorer.getStatistics(),
      alerts: this.alertManager.getStats(),
      session: this.sessionStore.getStatistics(),
      baselineProgress: this.trustScorer.getBaselineProgress(),
    };
  }

  /**
   * Get historical statistics
   */
  public getHistoricalStatistics(): ReturnType<HistoryManager['getHistoricalStatistics']> {
    return this.historyManager.getHistoricalStatistics();
  }

  /**
   * Update settings
   */
  public updateSettings(settings: Partial<ExtensionSettings>): void {
    if (settings.trustThresholds) {
      this.trustScorer.updateThresholds(settings.trustThresholds);
    }

    if (settings.enableNotifications !== undefined) {
      this.notificationService.setEnabled(settings.enableNotifications);
    }
  }

  /**
   * Add listener for score updates
   */
  public addListener(
    callback: (score: TrustScoreSnapshot, alerts: Alert[]) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(score: TrustScoreSnapshot, alerts: Alert[]): void {
    for (const listener of this.listeners) {
      try {
        listener(score, alerts);
      } catch (error) {
        console.error('[TrustScoringService] Listener error:', error);
      }
    }
  }

  /**
   * Check if session is active
   */
  public isSessionActive(): boolean {
    return this.sessionStore.isSessionActive();
  }

  /**
   * Get current session info
   */
  public getSessionInfo(): ReturnType<SessionStore['getSessionInfo']> {
    return this.sessionStore.getSessionInfo();
  }

  /**
   * Get baseline info
   */
  public getBaselineInfo(): {
    isEstablished: boolean;
    progress: ReturnType<TrustScorer['getBaselineProgress']>;
    baseline: ReturnType<TrustScorer['getBaseline']>;
  } {
    return {
      isEstablished: this.trustScorer.getBaseline()?.isEstablished ?? false,
      progress: this.trustScorer.getBaselineProgress(),
      baseline: this.trustScorer.getBaseline(),
    };
  }

  /**
   * Get threshold info
   */
  public getThresholdInfo(): ReturnType<TrustScorer['getThresholdInfo']> {
    return this.trustScorer.getThresholdInfo();
  }

  /**
   * Export session data
   */
  public exportSessionData(): string {
    const session = this.sessionStore.getCurrentSession();
    const scoring = this.trustScorer.getStatistics();
    const alerts = this.alertManager.getStats();

    return JSON.stringify(
      {
        session,
        scoring,
        alerts,
        exportedAt: Date.now(),
      },
      null,
      2,
    );
  }

  /**
   * Reset service state
   */
  public reset(): void {
    this.trustScorer.reset();
    this.alertManager.clearAll();
    this.analysisCache.clear();
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.analysisCache.stopCleanup();
    this.alertManager.stopCleanup();
    this.historyManager.stopPruning();
  }
}

// Singleton instance
let trustScoringServiceInstance: TrustScoringService | null = null;

/**
 * Get or create trust scoring service instance
 */
export function getTrustScoringService(
  config?: TrustScoringServiceConfig,
): TrustScoringService {
  if (!trustScoringServiceInstance) {
    trustScoringServiceInstance = new TrustScoringService(config);
  }
  return trustScoringServiceInstance;
}
