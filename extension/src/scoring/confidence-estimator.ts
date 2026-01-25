/**
 * Confidence Estimator
 * Calculates overall confidence in trust score based on multiple factors
 */

import {
  ConfidenceFactors,
  ConfidenceConfig,
  DEFAULT_CONFIDENCE_CONFIG,
  ComponentScores,
  TrustScoreResult,
} from './types';

export class ConfidenceEstimator {
  private config: ConfidenceConfig;
  private recentScores: TrustScoreResult[] = [];
  private maxRecentScores: number = 20;

  constructor(config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG) {
    this.config = config;
  }

  /**
   * Estimate confidence for current score
   */
  public estimate(
    components: Partial<ComponentScores>,
    analysisConfidences: { visual?: number; behavioral?: number; audio?: number },
    currentScore: number,
  ): number {
    const factors = this.calculateFactors(
      components,
      analysisConfidences,
      currentScore,
    );

    return this.calculateOverallConfidence(factors);
  }

  /**
   * Calculate individual confidence factors
   */
  private calculateFactors(
    components: Partial<ComponentScores>,
    analysisConfidences: { visual?: number; behavioral?: number; audio?: number },
    currentScore: number,
  ): ConfidenceFactors {
    return {
      dataQuality: this.calculateDataQuality(components),
      componentCoverage: this.calculateComponentCoverage(components),
      historicalConsistency: this.calculateHistoricalConsistency(currentScore),
      analysisConfidence: this.calculateAnalysisConfidence(analysisConfidences),
    };
  }

  /**
   * Calculate data quality factor
   */
  private calculateDataQuality(components: Partial<ComponentScores>): number {
    const { visual, behavioral, audio, contextual } = components;
    let quality = 0;
    let count = 0;

    // Score quality based on reasonable value ranges
    if (visual !== undefined && visual >= 0) {
      // Check if visual score is not at extremes (more reliable)
      const edgePenalty = this.getEdgePenalty(visual);
      quality += 1 - edgePenalty;
      count++;
    }

    if (behavioral !== undefined && behavioral >= 0) {
      const edgePenalty = this.getEdgePenalty(behavioral);
      quality += 1 - edgePenalty;
      count++;
    }

    if (audio !== undefined && audio >= 0) {
      const edgePenalty = this.getEdgePenalty(audio);
      quality += 1 - edgePenalty;
      count++;
    }

    if (contextual !== undefined && contextual >= 0) {
      quality += 0.8; // Contextual is inherently less reliable
      count++;
    }

    return count > 0 ? quality / count : 0;
  }

  /**
   * Calculate edge penalty for extreme values
   */
  private getEdgePenalty(value: number): number {
    // Extreme values (0-10 or 90-100) are less reliable
    if (value <= 10 || value >= 90) {
      return 0.2;
    }
    if (value <= 20 || value >= 80) {
      return 0.1;
    }
    return 0;
  }

  /**
   * Calculate component coverage factor
   */
  private calculateComponentCoverage(
    components: Partial<ComponentScores>,
  ): number {
    const availableComponents = Object.values(components).filter(
      (v) => v !== undefined && v >= 0,
    ).length;

    const totalComponents = 4; // visual, behavioral, audio, contextual

    return availableComponents / totalComponents;
  }

  /**
   * Calculate historical consistency factor
   */
  private calculateHistoricalConsistency(currentScore: number): number {
    if (this.recentScores.length < 3) {
      // Not enough history, assume moderate consistency
      return 0.7;
    }

    const recentOverallScores = this.recentScores.map((s) => s.overall);
    const mean =
      recentOverallScores.reduce((sum, s) => sum + s, 0) /
      recentOverallScores.length;

    // Calculate how far current score is from historical mean
    const deviation = Math.abs(currentScore - mean);

    // Normalize deviation (assuming max reasonable deviation is 50 points)
    const normalizedDeviation = Math.min(deviation / 50, 1);

    // Higher consistency = lower deviation
    return 1 - normalizedDeviation;
  }

  /**
   * Calculate analysis confidence factor
   */
  private calculateAnalysisConfidence(confidences: {
    visual?: number;
    behavioral?: number;
    audio?: number;
  }): number {
    const values: number[] = [];

    if (confidences.visual !== undefined) {
      values.push(confidences.visual);
    }

    if (confidences.behavioral !== undefined) {
      values.push(confidences.behavioral);
    }

    if (confidences.audio !== undefined) {
      values.push(confidences.audio);
    }

    if (values.length === 0) {
      return 0.5; // Default moderate confidence
    }

    // Return average of available confidences
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate overall confidence from factors
   */
  private calculateOverallConfidence(factors: ConfidenceFactors): number {
    const self = this;
    const { weights } = self.config;

    const weightedSum =
      factors.dataQuality * weights.dataQuality +
      factors.componentCoverage * weights.componentCoverage +
      factors.historicalConsistency * weights.historicalConsistency +
      factors.analysisConfidence * weights.analysisConfidence;

    // Apply uncertainty penalty if component coverage is low
    let confidence = weightedSum;
    if (factors.componentCoverage < 0.5) {
      confidence -= self.config.uncertaintyPenalty * (1 - factors.componentCoverage);
    }

    // Ensure minimum confidence and clamp to 0-1
    return Math.max(
      self.config.minConfidence,
      Math.min(1, confidence),
    );
  }

  /**
   * Add score to history for consistency tracking
   */
  public addToHistory(score: TrustScoreResult): void {
    this.recentScores.push(score);

    if (this.recentScores.length > this.maxRecentScores) {
      this.recentScores.shift();
    }
  }

  /**
   * Get detailed confidence breakdown
   */
  public getConfidenceBreakdown(
    components: Partial<ComponentScores>,
    analysisConfidences: { visual?: number; behavioral?: number; audio?: number },
    currentScore: number,
  ): {
    overall: number;
    factors: ConfidenceFactors;
    weights: ConfidenceConfig['weights'];
  } {
    const factors = this.calculateFactors(
      components,
      analysisConfidences,
      currentScore,
    );

    return {
      overall: this.calculateOverallConfidence(factors),
      factors,
      weights: { ...this.config.weights },
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ConfidenceConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      weights: {
        ...this.config.weights,
        ...(newConfig.weights || {}),
      },
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): ConfidenceConfig {
    return {
      ...this.config,
      weights: { ...this.config.weights },
    };
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.recentScores = [];
  }

  /**
   * Get history length
   */
  public getHistoryLength(): number {
    return this.recentScores.length;
  }

  /**
   * Evaluate confidence quality
   */
  public evaluateConfidenceQuality(confidence: number): {
    quality: 'high' | 'medium' | 'low';
    recommendation: string;
  } {
    if (confidence >= 0.8) {
      return {
        quality: 'high',
        recommendation: 'Trust score is highly reliable',
      };
    } else if (confidence >= 0.5) {
      return {
        quality: 'medium',
        recommendation: 'Trust score is moderately reliable, verify with additional context',
      };
    } else {
      return {
        quality: 'low',
        recommendation: 'Trust score has low confidence, gather more data before making decisions',
      };
    }
  }
}
