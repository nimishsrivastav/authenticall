/**
 * Trust Scorer
 * Main trust scoring engine that orchestrates all scoring components
 */

import { TrustLevel } from '../shared/types';
import {
  ComponentScores,
  TrustScoreResult,
  ScoreTrend,
  ScoringWeights,
  TrustThresholds,
  AnomalyConfig,
  BaselineConfig,
  ConfidenceConfig,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  DEFAULT_ANOMALY_CONFIG,
  DEFAULT_BASELINE_CONFIG,
  DEFAULT_CONFIDENCE_CONFIG,
} from './types';
import { WeightedCalculator } from './weighted-calculator';
import { ThresholdManager } from './threshold-manager';
import { AnomalyDetector } from './anomaly-detector';
import { ConfidenceEstimator } from './confidence-estimator';
import { BaselineTracker } from './baseline-tracker';

export interface TrustScorerConfig {
  weights?: ScoringWeights;
  thresholds?: TrustThresholds;
  anomaly?: AnomalyConfig;
  baseline?: BaselineConfig;
  confidence?: ConfidenceConfig;
  enableSmoothing?: boolean;
  smoothingFactor?: number;
}

export interface AnalysisInput {
  visual?: {
    score: number;
    confidence: number;
  };
  behavioral?: {
    score: number;
    confidence: number;
  };
  audio?: {
    score: number;
    confidence: number;
  };
  contextual?: number;
}

export class TrustScorer {
  private weightedCalculator: WeightedCalculator;
  private thresholdManager: ThresholdManager;
  private anomalyDetector: AnomalyDetector;
  private confidenceEstimator: ConfidenceEstimator;
  private baselineTracker: BaselineTracker;

  private enableSmoothing: boolean;
  private smoothingFactor: number;
  private lastScore: number | null = null;
  private scoreHistory: TrustScoreResult[] = [];
  private maxHistoryLength: number = 100;
  private currentSessionId: string | null = null;

  constructor(config: TrustScorerConfig = {}) {
    this.weightedCalculator = new WeightedCalculator(
      config.weights ?? DEFAULT_WEIGHTS,
    );
    this.thresholdManager = new ThresholdManager(
      config.thresholds ?? DEFAULT_THRESHOLDS,
    );
    this.anomalyDetector = new AnomalyDetector(
      config.anomaly ?? DEFAULT_ANOMALY_CONFIG,
    );
    this.confidenceEstimator = new ConfidenceEstimator(
      config.confidence ?? DEFAULT_CONFIDENCE_CONFIG,
    );
    this.baselineTracker = new BaselineTracker(
      config.baseline ?? DEFAULT_BASELINE_CONFIG,
    );

    this.enableSmoothing = config.enableSmoothing ?? true;
    this.smoothingFactor = config.smoothingFactor ?? 0.3;
  }

  /**
   * Calculate trust score from analysis input
   */
  public calculateScore(input: AnalysisInput): TrustScoreResult {
    // Build component scores
    const components: Partial<ComponentScores> = {};
    const confidences: { visual?: number; behavioral?: number; audio?: number } = {};

    if (input.visual) {
      components.visual = input.visual.score;
      confidences.visual = input.visual.confidence;
    }

    if (input.behavioral) {
      components.behavioral = input.behavioral.score;
      confidences.behavioral = input.behavioral.confidence;
    }

    if (input.audio) {
      components.audio = input.audio.score;
      confidences.audio = input.audio.confidence;
    }

    if (input.contextual !== undefined) {
      components.contextual = input.contextual;
    }

    // Calculate raw overall score
    let overall: number;
    if (this.enableSmoothing && this.lastScore !== null) {
      overall = this.weightedCalculator.calculateSmoothed(
        components,
        this.lastScore,
        this.smoothingFactor,
      );
    } else {
      overall = this.weightedCalculator.calculate(components);
    }

    // Determine trust level with hysteresis
    const level = this.thresholdManager.determineLevel(overall);

    // Estimate confidence
    const confidence = this.confidenceEstimator.estimate(
      components as Partial<ComponentScores>,
      confidences,
      overall,
    );

    // Detect anomalies
    const baseline = this.baselineTracker.getBaseline();
    const anomalyResult = this.anomalyDetector.detect(overall, baseline ?? undefined);

    // Calculate trend
    const trend = this.calculateTrend();

    // Build result
    const result: TrustScoreResult = {
      overall,
      components: {
        visual: components.visual ?? -1,
        behavioral: components.behavioral ?? -1,
        audio: components.audio ?? -1,
        contextual: components.contextual ?? -1,
      },
      confidence,
      level,
      timestamp: Date.now(),
      trend,
      isAnomaly: anomalyResult.isAnomaly,
    };

    if (anomalyResult.message !== undefined) {
      result.anomalyReason = anomalyResult.message;
    }

    // Update state
    this.lastScore = overall;
    this.scoreHistory.push(result);
    if (this.scoreHistory.length > this.maxHistoryLength) {
      this.scoreHistory.shift();
    }

    // Update baseline tracker
    this.baselineTracker.addSample(result);

    // Update confidence estimator history
    this.confidenceEstimator.addToHistory(result);

    return result;
  }

  /**
   * Calculate score trend
   */
  private calculateTrend(): ScoreTrend {
    if (this.scoreHistory.length < 3) {
      return 'stable';
    }

    const recentScores = this.scoreHistory.slice(-5).map((s) => s.overall);

    // Simple linear regression to determine trend
    const n = recentScores.length;
    const xSum = (n * (n + 1)) / 2;
    const ySum = recentScores.reduce((sum, score) => sum + score, 0);
    const xySum = recentScores.reduce(
      (sum, score, idx) => sum + score * (idx + 1),
      0,
    );
    const xxSum = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);

    // Classify trend based on slope
    if (slope > 2) {
      return 'improving';
    } else if (slope < -2) {
      return 'declining';
    }
    return 'stable';
  }

  /**
   * Start a new session
   */
  public startSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.baselineTracker.startSession(sessionId);
    this.thresholdManager.reset();
    this.anomalyDetector.clearHistory();
    this.confidenceEstimator.clearHistory();
    this.scoreHistory = [];
    this.lastScore = null;

    console.log(`[TrustScorer] Started session: ${sessionId}`);
  }

  /**
   * End current session
   */
  public endSession(): void {
    console.log(`[TrustScorer] Ended session: ${this.currentSessionId}`);
    this.currentSessionId = null;
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get score history
   */
  public getHistory(): TrustScoreResult[] {
    return [...this.scoreHistory];
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    count: number;
    average: number;
    min: number;
    max: number;
    trend: ScoreTrend;
    baselineEstablished: boolean;
    baselineAverage: number | null;
  } {
    const anomalyStats = this.anomalyDetector.getStatistics();
    const baselineSummary = this.baselineTracker.getSummary();

    return {
      count: anomalyStats.count,
      average: anomalyStats.average,
      min: anomalyStats.min,
      max: anomalyStats.max,
      trend: this.calculateTrend(),
      baselineEstablished: baselineSummary.isEstablished,
      baselineAverage: baselineSummary.averageScore,
    };
  }

  /**
   * Get baseline progress
   */
  public getBaselineProgress(): ReturnType<BaselineTracker['getEstablishmentProgress']> {
    return this.baselineTracker.getEstablishmentProgress();
  }

  /**
   * Get current baseline
   */
  public getBaseline(): ReturnType<BaselineTracker['getBaseline']> {
    return this.baselineTracker.getBaseline();
  }

  /**
   * Get threshold info
   */
  public getThresholdInfo(): {
    thresholds: TrustThresholds;
    currentLevel: TrustLevel;
    levelChangeImminent: boolean;
  } {
    return {
      thresholds: this.thresholdManager.getThresholds(),
      currentLevel: this.thresholdManager.getCurrentLevel(),
      levelChangeImminent: this.thresholdManager.isLevelChangeImminent(),
    };
  }

  /**
   * Update weights
   */
  public updateWeights(weights: Partial<ScoringWeights>): void {
    this.weightedCalculator.updateWeights(weights);
  }

  /**
   * Update thresholds
   */
  public updateThresholds(thresholds: Partial<TrustThresholds>): void {
    this.thresholdManager.updateThresholds(thresholds);
  }

  /**
   * Update anomaly config
   */
  public updateAnomalyConfig(config: Partial<AnomalyConfig>): void {
    this.anomalyDetector.updateConfig(config);
  }

  /**
   * Update baseline config
   */
  public updateBaselineConfig(config: Partial<BaselineConfig>): void {
    this.baselineTracker.updateConfig(config);
  }

  /**
   * Enable/disable smoothing
   */
  public setSmoothing(enabled: boolean, factor?: number): void {
    this.enableSmoothing = enabled;
    if (factor !== undefined) {
      this.smoothingFactor = Math.max(0, Math.min(1, factor));
    }
  }

  /**
   * Reset scorer state
   */
  public reset(): void {
    this.lastScore = null;
    this.scoreHistory = [];
    this.currentSessionId = null;
    this.thresholdManager.reset();
    this.anomalyDetector.clearHistory();
    this.confidenceEstimator.clearHistory();
    this.baselineTracker.reset();
  }

  /**
   * Get last score
   */
  public getLastScore(): TrustScoreResult | null {
    return this.scoreHistory.length > 0
      ? this.scoreHistory[this.scoreHistory.length - 1]!
      : null;
  }

  /**
   * Get component contributions
   */
  public getComponentContributions(
    components: Partial<ComponentScores>,
  ): ReturnType<WeightedCalculator['getContributionBreakdown']> {
    return this.weightedCalculator.getContributionBreakdown(components);
  }

  /**
   * Check if anomaly detection is enabled
   */
  public isAnomalyDetectionEnabled(): boolean {
    return this.anomalyDetector.isEnabled();
  }

  /**
   * Enable/disable anomaly detection
   */
  public setAnomalyDetection(enabled: boolean): void {
    this.anomalyDetector.setEnabled(enabled);
  }
}

/**
 * Create a trust scorer with default configuration
 */
export function createTrustScorer(config?: TrustScorerConfig): TrustScorer {
  return new TrustScorer(config);
}
