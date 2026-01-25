/**
 * Session Store
 * Manages current session data with Chrome storage integration
 */

import {
  SessionInfo,
  TrustScoreSnapshot,
  Alert,
  Platform,
} from '../shared/types';
import {
  StoredSession,
  SessionHistoryEntry,
  STORAGE_KEYS,
} from './types';

export class SessionStore {
  private currentSession: StoredSession | null = null;
  private listeners: Set<(session: StoredSession | null) => void> = new Set();

  constructor() {
    this.loadCurrentSession();
  }

  private async loadCurrentSession(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_SESSION);
      if (result[STORAGE_KEYS.CURRENT_SESSION]) {
        this.currentSession = result[STORAGE_KEYS.CURRENT_SESSION] as StoredSession;
      }
    } catch (error) {
      console.error('[SessionStore] Failed to load current session:', error);
    }
  }

  /**
   * Start a new session
   */
  public async startSession(
    platform: Platform,
    url: string,
    participantCount: number = 1,
  ): Promise<StoredSession> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: StoredSession = {
      info: {
        id: sessionId,
        platform,
        startTime: now,
        participantCount,
        url,
      },
      scores: [],
      alerts: [],
      statistics: {
        duration: 0,
        framesAnalyzed: 0,
        audioChunksAnalyzed: 0,
        transcriptsProcessed: 0,
        alertsTriggered: 0,
        averageTrustScore: 0,
        minTrustScore: 100,
        maxTrustScore: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.currentSession = session;
    await this.saveCurrentSession();
    this.notifyListeners();

    console.log(`[SessionStore] Started session: ${sessionId}`);
    return session;
  }

  /**
   * End current session
   */
  public async endSession(): Promise<StoredSession | null> {
    if (!this.currentSession) {
      return null;
    }

    const endTime = Date.now();
    this.currentSession.info.endTime = endTime;
    this.currentSession.statistics!.duration =
      endTime - this.currentSession.info.startTime;
    this.currentSession.updatedAt = endTime;

    const endedSession = { ...this.currentSession };

    // Clear current session
    await this.clearCurrentSession();

    console.log(`[SessionStore] Ended session: ${endedSession.info.id}`);
    return endedSession;
  }

  /**
   * Add trust score to current session
   */
  public async addScore(score: TrustScoreSnapshot): Promise<void> {
    if (!this.currentSession) {
      console.warn('[SessionStore] No active session to add score');
      return;
    }

    this.currentSession.scores.push(score);
    this.updateStatisticsFromScore(score);
    this.currentSession.updatedAt = Date.now();

    // Limit score history in memory
    if (this.currentSession.scores.length > 100) {
      this.currentSession.scores.shift();
    }

    await this.saveCurrentSession();
    this.notifyListeners();
  }

  /**
   * Add alert to current session
   */
  public async addAlert(alert: Alert): Promise<void> {
    if (!this.currentSession) {
      console.warn('[SessionStore] No active session to add alert');
      return;
    }

    this.currentSession.alerts.push(alert);
    this.currentSession.statistics!.alertsTriggered++;
    this.currentSession.updatedAt = Date.now();

    await this.saveCurrentSession();
    this.notifyListeners();
  }

  /**
   * Dismiss alert
   */
  public async dismissAlert(alertId: string): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    const alert = this.currentSession.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      this.currentSession.updatedAt = Date.now();
      await this.saveCurrentSession();
      this.notifyListeners();
      return true;
    }

    return false;
  }

  /**
   * Update participant count
   */
  public async updateParticipantCount(count: number): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.info.participantCount = count;
    this.currentSession.updatedAt = Date.now();

    await this.saveCurrentSession();
  }

  /**
   * Increment frames analyzed
   */
  public async incrementFramesAnalyzed(): Promise<void> {
    if (!this.currentSession || !this.currentSession.statistics) {
      return;
    }

    this.currentSession.statistics.framesAnalyzed++;
    this.currentSession.updatedAt = Date.now();
  }

  /**
   * Increment audio chunks analyzed
   */
  public async incrementAudioChunks(): Promise<void> {
    if (!this.currentSession || !this.currentSession.statistics) {
      return;
    }

    this.currentSession.statistics.audioChunksAnalyzed++;
    this.currentSession.updatedAt = Date.now();
  }

  /**
   * Increment transcripts processed
   */
  public async incrementTranscripts(): Promise<void> {
    if (!this.currentSession || !this.currentSession.statistics) {
      return;
    }

    this.currentSession.statistics.transcriptsProcessed++;
    this.currentSession.updatedAt = Date.now();
  }

  /**
   * Update statistics from score
   */
  private updateStatisticsFromScore(score: TrustScoreSnapshot): void {
    if (!this.currentSession || !this.currentSession.statistics) {
      return;
    }

    const stats = this.currentSession.statistics;
    const scores = this.currentSession.scores;

    // Update min/max
    stats.minTrustScore = Math.min(stats.minTrustScore, score.overall);
    stats.maxTrustScore = Math.max(stats.maxTrustScore, score.overall);

    // Update average
    const sum = scores.reduce((acc, s) => acc + s.overall, 0);
    stats.averageTrustScore = Math.round(sum / scores.length);

    // Update duration
    stats.duration = Date.now() - this.currentSession.info.startTime;
  }

  /**
   * Get current session
   */
  public getCurrentSession(): StoredSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Get session info
   */
  public getSessionInfo(): SessionInfo | null {
    return this.currentSession ? { ...this.currentSession.info } : null;
  }

  /**
   * Get active alerts (not dismissed)
   */
  public getActiveAlerts(): Alert[] {
    if (!this.currentSession) {
      return [];
    }

    return this.currentSession.alerts.filter((a) => !a.dismissed);
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): Alert[] {
    if (!this.currentSession) {
      return [];
    }

    return [...this.currentSession.alerts];
  }

  /**
   * Get latest score
   */
  public getLatestScore(): TrustScoreSnapshot | null {
    if (!this.currentSession || this.currentSession.scores.length === 0) {
      return null;
    }

    return this.currentSession.scores[this.currentSession.scores.length - 1]!;
  }

  /**
   * Get score history
   */
  public getScoreHistory(): TrustScoreSnapshot[] {
    if (!this.currentSession) {
      return [];
    }

    return [...this.currentSession.scores];
  }

  /**
   * Get session statistics
   */
  public getStatistics(): StoredSession['statistics'] | null {
    if (!this.currentSession || !this.currentSession.statistics) {
      return null;
    }

    return { ...this.currentSession.statistics };
  }

  /**
   * Check if session is active
   */
  public isSessionActive(): boolean {
    return this.currentSession !== null && !this.currentSession.info.endTime;
  }

  /**
   * Get session duration
   */
  public getSessionDuration(): number {
    if (!this.currentSession) {
      return 0;
    }

    const endTime = this.currentSession.info.endTime || Date.now();
    return endTime - this.currentSession.info.startTime;
  }

  /**
   * Convert to history entry
   */
  public toHistoryEntry(): SessionHistoryEntry | null {
    if (!this.currentSession) {
      return null;
    }

    const session = this.currentSession;
    const entry: SessionHistoryEntry = {
      id: session.info.id,
      platform: session.info.platform,
      startTime: session.info.startTime,
      duration: this.getSessionDuration(),
      participantCount: session.info.participantCount,
      averageTrustScore: session.statistics?.averageTrustScore ?? 0,
      minTrustScore: session.statistics?.minTrustScore ?? 0,
      maxTrustScore: session.statistics?.maxTrustScore ?? 0,
      alertCount: session.alerts.length,
      framesAnalyzed: session.statistics?.framesAnalyzed ?? 0,
    };

    if (session.info.endTime !== undefined) {
      entry.endTime = session.info.endTime;
    }

    return entry;
  }

  /**
   * Add listener for session changes
   */
  public addListener(
    callback: (session: StoredSession | null) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentSession);
      } catch (error) {
        console.error('[SessionStore] Listener error:', error);
      }
    }
  }

  /**
   * Save current session to storage
   */
  private async saveCurrentSession(): Promise<void> {
    try {
      if (this.currentSession) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.CURRENT_SESSION]: this.currentSession,
        });
      }
    } catch (error) {
      console.error('[SessionStore] Failed to save session:', error);
    }
  }

  /**
   * Clear current session from storage
   */
  private async clearCurrentSession(): Promise<void> {
    this.currentSession = null;
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_SESSION);
    } catch (error) {
      console.error('[SessionStore] Failed to clear session:', error);
    }
    this.notifyListeners();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
let sessionStoreInstance: SessionStore | null = null;

/**
 * Get or create session store instance
 */
export function getSessionStore(): SessionStore {
  if (!sessionStoreInstance) {
    sessionStoreInstance = new SessionStore();
  }
  return sessionStoreInstance;
}
