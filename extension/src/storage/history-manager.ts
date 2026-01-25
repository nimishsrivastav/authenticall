/**
 * History Manager
 * Manages historical data for sessions, scores, and alerts
 */

import { TrustScoreSnapshot, Alert } from '../shared/types';
import {
  SessionHistoryEntry,
  TrustScoreHistoryEntry,
  AlertHistoryEntry,
  HistoryConfig,
  DEFAULT_HISTORY_CONFIG,
  STORAGE_KEYS,
  StoredSession,
} from './types';

export class HistoryManager {
  private config: HistoryConfig;
  private sessionHistory: SessionHistoryEntry[] = [];
  private scoreHistory: TrustScoreHistoryEntry[] = [];
  private alertHistory: AlertHistoryEntry[] = [];
  private pruneInterval?: ReturnType<typeof setInterval>;

  constructor(config: HistoryConfig = DEFAULT_HISTORY_CONFIG) {
    this.config = config;
    this.loadFromStorage();
    this.startPruning();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.SESSION_HISTORY,
        STORAGE_KEYS.SCORE_HISTORY,
        STORAGE_KEYS.ALERT_HISTORY,
      ]);

      if (result[STORAGE_KEYS.SESSION_HISTORY]) {
        this.sessionHistory = result[STORAGE_KEYS.SESSION_HISTORY] as SessionHistoryEntry[];
      }

      if (result[STORAGE_KEYS.SCORE_HISTORY]) {
        this.scoreHistory = result[STORAGE_KEYS.SCORE_HISTORY] as TrustScoreHistoryEntry[];
      }

      if (result[STORAGE_KEYS.ALERT_HISTORY]) {
        this.alertHistory = result[STORAGE_KEYS.ALERT_HISTORY] as AlertHistoryEntry[];
      }

      console.log(
        `[HistoryManager] Loaded: ${this.sessionHistory.length} sessions, ${this.scoreHistory.length} scores, ${this.alertHistory.length} alerts`,
      );
    } catch (error) {
      console.error('[HistoryManager] Failed to load from storage:', error);
    }
  }

  /**
   * Save history to Chrome storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SESSION_HISTORY]: this.sessionHistory,
        [STORAGE_KEYS.SCORE_HISTORY]: this.scoreHistory,
        [STORAGE_KEYS.ALERT_HISTORY]: this.alertHistory,
      });
    } catch (error) {
      console.error('[HistoryManager] Failed to save to storage:', error);
    }
  }

  /**
   * Start automatic pruning
   */
  private startPruning(): void {
    this.pruneInterval = setInterval(() => {
      this.prune();
    }, this.config.pruneInterval);
  }

  /**
   * Stop automatic pruning
   */
  public stopPruning(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
    }
  }

  /**
   * Add completed session to history
   */
  public async addSession(session: StoredSession): Promise<void> {
    const entry: SessionHistoryEntry = {
      id: session.info.id,
      platform: session.info.platform,
      startTime: session.info.startTime,
      duration: session.info.endTime
        ? session.info.endTime - session.info.startTime
        : 0,
      participantCount: session.info.participantCount,
      averageTrustScore: session.statistics?.averageTrustScore ?? 0,
      minTrustScore: session.statistics?.minTrustScore ?? 100,
      maxTrustScore: session.statistics?.maxTrustScore ?? 0,
      alertCount: session.alerts.length,
      framesAnalyzed: session.statistics?.framesAnalyzed ?? 0,
    };

    if (session.info.endTime !== undefined) {
      entry.endTime = session.info.endTime;
    }

    this.sessionHistory.unshift(entry);

    // Add scores to history
    for (const score of session.scores) {
      this.addScore(session.info.id, score, false);
    }

    // Add alerts to history
    for (const alert of session.alerts) {
      this.addAlert(session.info.id, alert, false);
    }

    // Prune if needed
    if (this.sessionHistory.length > this.config.maxSessionHistory) {
      this.sessionHistory = this.sessionHistory.slice(
        0,
        this.config.maxSessionHistory,
      );
    }

    await this.saveToStorage();
    console.log(`[HistoryManager] Added session to history: ${entry.id}`);
  }

  /**
   * Add score to history
   */
  public addScore(
    sessionId: string,
    score: TrustScoreSnapshot,
    save: boolean = true,
  ): void {
    const entry: TrustScoreHistoryEntry = {
      sessionId,
      score,
      timestamp: score.timestamp,
    };

    this.scoreHistory.unshift(entry);

    // Prune if needed
    if (this.scoreHistory.length > this.config.maxScoreHistory) {
      this.scoreHistory = this.scoreHistory.slice(
        0,
        this.config.maxScoreHistory,
      );
    }

    if (save) {
      this.saveToStorage();
    }
  }

  /**
   * Add alert to history
   */
  public addAlert(
    sessionId: string,
    alert: Alert,
    save: boolean = true,
  ): void {
    const entry: AlertHistoryEntry = {
      sessionId,
      alert,
      timestamp: alert.timestamp,
    };

    this.alertHistory.unshift(entry);

    // Prune if needed
    if (this.alertHistory.length > this.config.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(
        0,
        this.config.maxAlertHistory,
      );
    }

    if (save) {
      this.saveToStorage();
    }
  }

  /**
   * Get session history
   */
  public getSessionHistory(limit?: number): SessionHistoryEntry[] {
    const history = [...this.sessionHistory];
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): SessionHistoryEntry | null {
    return this.sessionHistory.find((s) => s.id === sessionId) || null;
  }

  /**
   * Get score history
   */
  public getScoreHistory(
    sessionId?: string,
    limit?: number,
  ): TrustScoreHistoryEntry[] {
    let history = [...this.scoreHistory];

    if (sessionId) {
      history = history.filter((s) => s.sessionId === sessionId);
    }

    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get alert history
   */
  public getAlertHistory(
    sessionId?: string,
    limit?: number,
  ): AlertHistoryEntry[] {
    let history = [...this.alertHistory];

    if (sessionId) {
      history = history.filter((a) => a.sessionId === sessionId);
    }

    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get alerts by severity
   */
  public getAlertsBySeverity(
    severity: Alert['severity'],
    limit?: number,
  ): AlertHistoryEntry[] {
    let alerts = this.alertHistory.filter((a) => a.alert.severity === severity);
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Get recent scores (last N entries)
   */
  public getRecentScores(count: number = 100): TrustScoreSnapshot[] {
    return this.scoreHistory.slice(0, count).map((entry) => entry.score);
  }

  /**
   * Calculate historical statistics
   */
  public getHistoricalStatistics(): {
    totalSessions: number;
    totalDuration: number;
    totalAlerts: number;
    averageTrustScore: number;
    averageSessionDuration: number;
    alertsByCategory: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  } {
    const totalSessions = this.sessionHistory.length;
    const totalDuration = this.sessionHistory.reduce(
      (sum, s) => sum + s.duration,
      0,
    );
    const totalAlerts = this.alertHistory.length;

    // Calculate average trust score
    const avgTrustScore =
      this.sessionHistory.length > 0
        ? this.sessionHistory.reduce((sum, s) => sum + s.averageTrustScore, 0) /
          this.sessionHistory.length
        : 0;

    // Calculate average session duration
    const avgSessionDuration =
      this.sessionHistory.length > 0
        ? totalDuration / this.sessionHistory.length
        : 0;

    // Count alerts by category
    const alertsByCategory: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    for (const entry of this.alertHistory) {
      const category = entry.alert.category;
      const severity = entry.alert.severity;

      alertsByCategory[category] = (alertsByCategory[category] || 0) + 1;
      alertsBySeverity[severity] = (alertsBySeverity[severity] || 0) + 1;
    }

    return {
      totalSessions,
      totalDuration,
      totalAlerts,
      averageTrustScore: Math.round(avgTrustScore),
      averageSessionDuration: Math.round(avgSessionDuration),
      alertsByCategory,
      alertsBySeverity,
    };
  }

  /**
   * Search sessions
   */
  public searchSessions(query: {
    platform?: string;
    minScore?: number;
    maxScore?: number;
    startDate?: number;
    endDate?: number;
  }): SessionHistoryEntry[] {
    return this.sessionHistory.filter((session) => {
      if (query.platform && session.platform !== query.platform) {
        return false;
      }
      if (
        query.minScore !== undefined &&
        session.averageTrustScore < query.minScore
      ) {
        return false;
      }
      if (
        query.maxScore !== undefined &&
        session.averageTrustScore > query.maxScore
      ) {
        return false;
      }
      if (query.startDate !== undefined && session.startTime < query.startDate) {
        return false;
      }
      if (query.endDate !== undefined && session.startTime > query.endDate) {
        return false;
      }
      return true;
    });
  }

  /**
   * Prune old entries
   */
  public async prune(): Promise<void> {
    const initialCounts = {
      sessions: this.sessionHistory.length,
      scores: this.scoreHistory.length,
      alerts: this.alertHistory.length,
    };

    // Prune to configured limits
    if (this.sessionHistory.length > this.config.maxSessionHistory) {
      this.sessionHistory = this.sessionHistory.slice(
        0,
        this.config.maxSessionHistory,
      );
    }

    if (this.scoreHistory.length > this.config.maxScoreHistory) {
      this.scoreHistory = this.scoreHistory.slice(
        0,
        this.config.maxScoreHistory,
      );
    }

    if (this.alertHistory.length > this.config.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(
        0,
        this.config.maxAlertHistory,
      );
    }

    const prunedCounts = {
      sessions: initialCounts.sessions - this.sessionHistory.length,
      scores: initialCounts.scores - this.scoreHistory.length,
      alerts: initialCounts.alerts - this.alertHistory.length,
    };

    if (
      prunedCounts.sessions > 0 ||
      prunedCounts.scores > 0 ||
      prunedCounts.alerts > 0
    ) {
      await this.saveToStorage();
      console.log('[HistoryManager] Pruned:', prunedCounts);
    }
  }

  /**
   * Clear all history
   */
  public async clearAll(): Promise<void> {
    this.sessionHistory = [];
    this.scoreHistory = [];
    this.alertHistory = [];
    await this.saveToStorage();
    console.log('[HistoryManager] Cleared all history');
  }

  /**
   * Clear history for specific session
   */
  public async clearSession(sessionId: string): Promise<void> {
    this.sessionHistory = this.sessionHistory.filter((s) => s.id !== sessionId);
    this.scoreHistory = this.scoreHistory.filter(
      (s) => s.sessionId !== sessionId,
    );
    this.alertHistory = this.alertHistory.filter(
      (a) => a.sessionId !== sessionId,
    );
    await this.saveToStorage();
    console.log(`[HistoryManager] Cleared history for session: ${sessionId}`);
  }

  /**
   * Export history as JSON
   */
  public exportHistory(): string {
    return JSON.stringify(
      {
        sessions: this.sessionHistory,
        scores: this.scoreHistory,
        alerts: this.alertHistory,
        exportedAt: Date.now(),
      },
      null,
      2,
    );
  }

  /**
   * Import history from JSON
   */
  public async importHistory(json: string): Promise<boolean> {
    try {
      const data = JSON.parse(json);

      if (data.sessions) {
        this.sessionHistory = [...data.sessions, ...this.sessionHistory];
      }

      if (data.scores) {
        this.scoreHistory = [...data.scores, ...this.scoreHistory];
      }

      if (data.alerts) {
        this.alertHistory = [...data.alerts, ...this.alertHistory];
      }

      await this.prune();
      return true;
    } catch (error) {
      console.error('[HistoryManager] Failed to import history:', error);
      return false;
    }
  }

  /**
   * Get storage size estimate
   */
  public getStorageSize(): number {
    const data = JSON.stringify({
      sessions: this.sessionHistory,
      scores: this.scoreHistory,
      alerts: this.alertHistory,
    });
    return new Blob([data]).size;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<HistoryConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): HistoryConfig {
    return { ...this.config };
  }
}

// Singleton instance
let historyManagerInstance: HistoryManager | null = null;

/**
 * Get or create history manager instance
 */
export function getHistoryManager(): HistoryManager {
  if (!historyManagerInstance) {
    historyManagerInstance = new HistoryManager();
  }
  return historyManagerInstance;
}
