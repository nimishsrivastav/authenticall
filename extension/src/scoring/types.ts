/**
 * Scoring Module Types
 * Defines types for trust scoring, anomaly detection, and baseline tracking
 */

import { TrustLevel, AlertSeverity } from '../shared/types';

/**
 * Component scores from different analysis types
 */
export interface ComponentScores {
  visual: number;
  behavioral: number;
  audio: number;
  contextual: number;
}

/**
 * Weights for each component in the final score calculation
 */
export interface ScoringWeights {
  visual: number;
  behavioral: number;
  audio: number;
  contextual: number;
}

/**
 * Default scoring weights
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  visual: 0.35,
  behavioral: 0.45,
  audio: 0.1,
  contextual: 0.1,
};

/**
 * Trust thresholds for determining trust level
 */
export interface TrustThresholds {
  safe: number; // Score >= safe means safe
  caution: number; // Score >= caution and < safe means caution
  danger: number; // Score < caution means danger
}

/**
 * Default trust thresholds
 */
export const DEFAULT_THRESHOLDS: TrustThresholds = {
  safe: 85,
  caution: 50,
  danger: 0,
};

/**
 * Hysteresis settings to prevent level flickering
 */
export interface HysteresisSettings {
  enabled: boolean;
  buffer: number; // Points of buffer before level change
  minSamplesBeforeChange: number; // Minimum consecutive samples needed
}

/**
 * Default hysteresis settings
 */
export const DEFAULT_HYSTERESIS: HysteresisSettings = {
  enabled: true,
  buffer: 5,
  minSamplesBeforeChange: 3,
};

/**
 * Calculated trust score result
 */
export interface TrustScoreResult {
  overall: number;
  components: ComponentScores;
  confidence: number;
  level: TrustLevel;
  timestamp: number;
  trend: ScoreTrend;
  isAnomaly: boolean;
  anomalyReason?: string;
}

/**
 * Score trend direction
 */
export type ScoreTrend = 'improving' | 'stable' | 'declining';

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  isAnomaly: boolean;
  type?: AnomalyType;
  severity?: AlertSeverity;
  deviation?: number;
  message?: string;
}

/**
 * Types of anomalies that can be detected
 */
export type AnomalyType =
  | 'sudden_drop' // Score dropped significantly
  | 'sudden_spike' // Score increased unexpectedly (potential recovery or manipulation)
  | 'sustained_low' // Score stayed low for extended period
  | 'volatility' // Score is fluctuating rapidly
  | 'baseline_deviation'; // Score deviates significantly from baseline

/**
 * Anomaly detection configuration
 */
export interface AnomalyConfig {
  enabled: boolean;
  suddenDropThreshold: number; // Points drop considered sudden (default: 40)
  suddenSpikeThreshold: number; // Points increase considered sudden (default: 30)
  volatilityWindow: number; // Number of samples for volatility calculation
  volatilityThreshold: number; // Standard deviation threshold for volatility
  baselineDeviationThreshold: number; // Percentage deviation from baseline
  sustainedLowDuration: number; // Duration in ms for sustained low detection
  sustainedLowThreshold: number; // Score threshold for sustained low
}

/**
 * Default anomaly configuration
 */
export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  enabled: true,
  suddenDropThreshold: 40,
  suddenSpikeThreshold: 30,
  volatilityWindow: 10,
  volatilityThreshold: 15,
  baselineDeviationThreshold: 0.3, // 30% deviation
  sustainedLowDuration: 60000, // 1 minute
  sustainedLowThreshold: 50,
};

/**
 * Baseline data for a session
 */
export interface BaselineData {
  sessionId: string;
  establishedAt: number;
  samples: number;
  averageScore: number;
  standardDeviation: number;
  componentAverages: ComponentScores;
  isEstablished: boolean;
  minEstablishmentSamples: number;
  establishmentDuration: number;
}

/**
 * Baseline configuration
 */
export interface BaselineConfig {
  minSamples: number; // Minimum samples to establish baseline
  establishmentDuration: number; // Duration in ms to collect baseline (default: 2 minutes)
  adaptiveUpdateRate: number; // How quickly baseline adapts (0-1, lower = slower)
  maxAge: number; // Max age of baseline data in ms before reset
}

/**
 * Default baseline configuration
 */
export const DEFAULT_BASELINE_CONFIG: BaselineConfig = {
  minSamples: 10,
  establishmentDuration: 120000, // 2 minutes
  adaptiveUpdateRate: 0.1,
  maxAge: 3600000, // 1 hour
};

/**
 * Confidence factors for estimation
 */
export interface ConfidenceFactors {
  dataQuality: number; // Quality of input data (0-1)
  componentCoverage: number; // How many components have data (0-1)
  historicalConsistency: number; // Consistency with history (0-1)
  analysisConfidence: number; // Confidence from analyzers (0-1)
}

/**
 * Confidence estimation configuration
 */
export interface ConfidenceConfig {
  weights: {
    dataQuality: number;
    componentCoverage: number;
    historicalConsistency: number;
    analysisConfidence: number;
  };
  minConfidence: number; // Minimum confidence to report
  uncertaintyPenalty: number; // Penalty for missing data
}

/**
 * Default confidence configuration
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  weights: {
    dataQuality: 0.25,
    componentCoverage: 0.25,
    historicalConsistency: 0.25,
    analysisConfidence: 0.25,
  },
  minConfidence: 0.1,
  uncertaintyPenalty: 0.2,
};

/**
 * Score history entry
 */
export interface ScoreHistoryEntry {
  timestamp: number;
  score: TrustScoreResult;
  sessionId: string;
}

/**
 * Score statistics
 */
export interface ScoreStatistics {
  count: number;
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
  trend: ScoreTrend;
  lastUpdated: number;
}
