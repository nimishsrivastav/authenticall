/**
 * Alerts Module Types
 * Defines types for alert management, notifications, and severity classification
 */

import { Alert, AlertSeverity, AlertCategory } from '../shared/types';

/**
 * Alert generation configuration
 */
export interface AlertConfig {
  enabled: boolean;
  minSeverityForNotification: AlertSeverity;
  deduplicationWindow: number; // Time in ms to deduplicate similar alerts
  maxActiveAlerts: number;
  rateLimit: {
    maxPerMinute: number;
    maxPerType: number; // Max per alert type per minute
  };
  autoCleanupAge: number; // Auto-dismiss alerts older than this (ms)
}

/**
 * Default alert configuration
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: true,
  minSeverityForNotification: 'medium',
  deduplicationWindow: 30000, // 30 seconds
  maxActiveAlerts: 50,
  rateLimit: {
    maxPerMinute: 10,
    maxPerType: 3,
  },
  autoCleanupAge: 3600000, // 1 hour
};

/**
 * Alert trigger source
 */
export interface AlertTrigger {
  source: 'visual' | 'behavioral' | 'fusion' | 'anomaly' | 'system';
  score?: number;
  confidence?: number;
  indicators?: string[];
  timestamp: number;
}

/**
 * Alert generation result
 */
export interface AlertGenerationResult {
  alert: Alert | null;
  suppressed: boolean;
  reason?: string;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  enabled: boolean;
  soundEnabled: boolean;
  minSeverity: AlertSeverity;
  showPreview: boolean;
  requireInteraction: boolean;
  buttons: boolean;
  iconPath: string;
}

/**
 * Default notification configuration
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enabled: true,
  soundEnabled: true,
  minSeverity: 'medium',
  showPreview: true,
  requireInteraction: true,
  buttons: true,
  iconPath: 'icons/icon128.png',
};

/**
 * Notification result
 */
export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * Severity classification input
 */
export interface SeverityInput {
  trustScore: number;
  confidence: number;
  indicators: Array<{
    type: string;
    severity: string;
  }>;
  isAnomaly: boolean;
  anomalyType?: string;
  category: AlertCategory;
}

/**
 * Severity classification result
 */
export interface SeverityClassificationResult {
  severity: AlertSeverity;
  confidence: number;
  factors: string[];
  actionRequired: boolean;
}

/**
 * Severity rules
 */
export interface SeverityRules {
  criticalScoreThreshold: number;
  highScoreThreshold: number;
  mediumScoreThreshold: number;
  criticalIndicatorTypes: string[];
  highIndicatorTypes: string[];
  confidenceWeight: number;
}

/**
 * Default severity rules
 */
export const DEFAULT_SEVERITY_RULES: SeverityRules = {
  criticalScoreThreshold: 30,
  highScoreThreshold: 50,
  mediumScoreThreshold: 70,
  criticalIndicatorTypes: ['deepfake', 'social_engineering', 'impersonation'],
  highIndicatorTypes: ['urgency', 'authority', 'unusual_request', 'facial'],
  confidenceWeight: 0.2,
};

/**
 * Alert deduplication key
 */
export interface DeduplicationKey {
  category: AlertCategory;
  title: string;
  hash: string;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  total: number;
  active: number;
  dismissed: number;
  byCategory: Record<AlertCategory, number>;
  bySeverity: Record<AlertSeverity, number>;
  lastAlertTime: number | null;
  alertsPerMinute: number;
}
