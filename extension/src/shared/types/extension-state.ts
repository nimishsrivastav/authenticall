/**
 * Extension State Types
 * Defines the state management structures
 */

/**
 * Monitoring state
 */
export enum MonitoringState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

/**
 * Platform type
 */
export type Platform = 'google-meet' | 'zoom' | 'teams' | 'unknown';

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  platform: Platform;
  startTime: number;
  endTime?: number;
  participantCount: number;
  url: string;
}

/**
 * Participant information
 */
export interface Participant {
  id: string;
  name?: string;
  isHost: boolean;
  joinedAt: number;
  trustScoreHistory: TrustScoreSnapshot[];
  alerts: Alert[];
}

/**
 * Trust score snapshot
 */
export interface TrustScoreSnapshot {
  timestamp: number;
  overall: number;
  visual: number;
  audio: number;
  behavioral: number;
  confidence: number;
  level: TrustLevel;
}

/**
 * Trust level
 */
export type TrustLevel = 'safe' | 'caution' | 'danger' | 'unknown';

/**
 * Alert information
 */
export interface Alert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  details?: string;
  actionRequired: boolean;
  dismissed: boolean;
  participantId?: string;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 'visual' | 'audio' | 'behavioral' | 'fusion';

/**
 * Extension global state
 */
export interface ExtensionState {
  monitoring: {
    state: MonitoringState;
    currentSession?: SessionInfo;
    participants: Map<string, Participant>;
    error?: string;
  };
  trustScore: {
    current: TrustScoreSnapshot;
    history: TrustScoreSnapshot[];
  };
  alerts: {
    active: Alert[];
    history: Alert[];
  };
  statistics: SessionStatistics;
  settings: ExtensionSettings;
}

/**
 * Session statistics
 */
export interface SessionStatistics {
  sessionsTotal: number;
  currentSession?: {
    duration: number;
    framesAnalyzed: number;
    audioChunksAnalyzed: number;
    transcriptsProcessed: number;
    alertsTriggered: number;
    averageTrustScore: number;
    minTrustScore: number;
    maxTrustScore: number;
  };
  allTime: {
    totalDuration: number;
    totalFramesAnalyzed: number;
    totalAlertsTriggered: number;
  };
}

/**
 * Extension settings (from chrome-messages.ts)
 */
export interface ExtensionSettings {
  apiKey: string;
  geminiModel: string;
  enableNotifications: boolean;
  notificationSound: boolean;
  trustThresholds: {
    safe: number;
    caution: number;
    danger: number;
  };
  captureSettings: {
    videoFps: number;
    audioDuration: number;
    maxConcurrentRequests: number;
  };
  enableTelemetry: boolean;
  enableDebugMode: boolean;
}

/**
 * Default extension settings
 */


export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  geminiModel: 'gemini-3-flash-preview',
  enableNotifications: true,
  notificationSound: true,
  trustThresholds: {
    safe: 85,
    caution: 50,
    danger: 0,
  },
  captureSettings: {
    videoFps: 1,
    audioDuration: 5000,
    maxConcurrentRequests: 3,
  },
  enableTelemetry: false,
  enableDebugMode: false,
};

console.log('Extension State:', DEFAULT_SETTINGS);

/**
 * Default trust score
 */
export const DEFAULT_TRUST_SCORE: TrustScoreSnapshot = {
  timestamp: Date.now(),
  overall: 0,
  visual: 0,
  audio: 0,
  behavioral: 0,
  confidence: 0,
  level: 'unknown',
};

/**
 * Storage keys for Chrome storage
 */
export const STORAGE_KEYS = {
  SETTINGS: 'authenticall_settings',
  SESSION_HISTORY: 'authenticall_session_history',
  STATISTICS: 'authenticall_statistics',
  ALERT_HISTORY: 'authenticall_alert_history',
  CACHE: 'authenticall_cache',
} as const;