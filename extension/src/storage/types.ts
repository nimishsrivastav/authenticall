/**
 * Storage Module Types
 * Defines types for session storage, history management, and caching
 */

import {
  SessionInfo,
  TrustScoreSnapshot,
  Alert,
  SessionStatistics,
  Platform,
} from '../shared/types';

/**
 * Stored session data
 */
export interface StoredSession {
  info: SessionInfo;
  scores: TrustScoreSnapshot[];
  alerts: Alert[];
  statistics: SessionStatistics['currentSession'];
  createdAt: number;
  updatedAt: number;
}

/**
 * Session history entry (minimal data for list view)
 */
export interface SessionHistoryEntry {
  id: string;
  platform: Platform;
  startTime: number;
  endTime?: number;
  duration: number;
  participantCount: number;
  averageTrustScore: number;
  minTrustScore: number;
  maxTrustScore: number;
  alertCount: number;
  framesAnalyzed: number;
}

/**
 * Trust score history entry
 */
export interface TrustScoreHistoryEntry {
  sessionId: string;
  score: TrustScoreSnapshot;
  timestamp: number;
}

/**
 * Alert history entry
 */
export interface AlertHistoryEntry {
  sessionId: string;
  alert: Alert;
  timestamp: number;
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 300000, // 5 minutes
  maxSize: 1000,
  cleanupInterval: 60000, // 1 minute
};

/**
 * History manager configuration
 */
export interface HistoryConfig {
  maxScoreHistory: number; // Maximum score history entries
  maxAlertHistory: number; // Maximum alert history entries
  maxSessionHistory: number; // Maximum session history entries
  pruneInterval: number; // Prune interval in milliseconds
}

/**
 * Default history configuration
 */
export const DEFAULT_HISTORY_CONFIG: HistoryConfig = {
  maxScoreHistory: 1000,
  maxAlertHistory: 500,
  maxSessionHistory: 50,
  pruneInterval: 3600000, // 1 hour
};

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  CURRENT_SESSION: 'authenticall_current_session',
  SESSION_HISTORY: 'authenticall_session_history',
  SCORE_HISTORY: 'authenticall_score_history',
  ALERT_HISTORY: 'authenticall_alert_history',
  SETTINGS: 'authenticall_settings',
  STATISTICS: 'authenticall_statistics',
  CACHE: 'authenticall_cache',
} as const;

/**
 * Storage statistics
 */
export interface StorageStats {
  currentSessionSize: number;
  sessionHistoryCount: number;
  scoreHistoryCount: number;
  alertHistoryCount: number;
  cacheEntryCount: number;
  totalSizeBytes: number;
}
