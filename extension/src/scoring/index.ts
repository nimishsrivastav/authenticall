/**
 * Scoring Module
 * Exports all scoring-related components and types
 */

// Types
export * from './types';

// Components
export { WeightedCalculator } from './weighted-calculator';
export { ThresholdManager } from './threshold-manager';
export { AnomalyDetector } from './anomaly-detector';
export { ConfidenceEstimator } from './confidence-estimator';
export { BaselineTracker } from './baseline-tracker';
export {
  TrustScorer,
  createTrustScorer,
  type TrustScorerConfig,
  type AnalysisInput,
} from './trust-scorer';
