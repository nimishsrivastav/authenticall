/**
 * Weighted Calculator
 * Applies component weights to calculate overall trust score
 */

import {
  ComponentScores,
  ScoringWeights,
  DEFAULT_WEIGHTS,
} from './types';

export class WeightedCalculator {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = this.normalizeWeights(weights);
  }

  /**
   * Calculate weighted overall score from components
   */
  public calculate(components: Partial<ComponentScores>): number {
    const { visual, behavioral, audio, contextual } = components;

    // Track available components and their contributions
    let weightedSum = 0;
    let totalWeight = 0;

    if (visual !== undefined && visual >= 0) {
      weightedSum += visual * this.weights.visual;
      totalWeight += this.weights.visual;
    }

    if (behavioral !== undefined && behavioral >= 0) {
      weightedSum += behavioral * this.weights.behavioral;
      totalWeight += this.weights.behavioral;
    }

    if (audio !== undefined && audio >= 0) {
      weightedSum += audio * this.weights.audio;
      totalWeight += this.weights.audio;
    }

    if (contextual !== undefined && contextual >= 0) {
      weightedSum += contextual * this.weights.contextual;
      totalWeight += this.weights.contextual;
    }

    // If no components available, return neutral score
    if (totalWeight === 0) {
      return 75;
    }

    // Normalize by available weight
    const score = weightedSum / totalWeight;

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate score with missing component penalty
   */
  public calculateWithPenalty(
    components: Partial<ComponentScores>,
    missingPenalty: number = 0.1,
  ): number {
    const availableCount = Object.values(components).filter(
      (v) => v !== undefined && v >= 0,
    ).length;
    const totalComponents = 4;
    const coverageRatio = availableCount / totalComponents;

    const baseScore = this.calculate(components);

    // Apply penalty for missing components
    const penalty = (1 - coverageRatio) * missingPenalty * 100;

    return Math.max(0, Math.round(baseScore - penalty));
  }

  /**
   * Calculate smoothed score using exponential moving average
   */
  public calculateSmoothed(
    currentComponents: Partial<ComponentScores>,
    previousScore: number,
    smoothingFactor: number = 0.3,
  ): number {
    const newScore = this.calculate(currentComponents);

    // Exponential moving average: new = alpha * current + (1 - alpha) * previous
    const smoothedScore =
      smoothingFactor * newScore + (1 - smoothingFactor) * previousScore;

    return Math.max(0, Math.min(100, Math.round(smoothedScore)));
  }

  /**
   * Update weights
   */
  public updateWeights(newWeights: Partial<ScoringWeights>): void {
    this.weights = this.normalizeWeights({
      ...this.weights,
      ...newWeights,
    });
  }

  /**
   * Get current weights
   */
  public getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(weights: ScoringWeights): ScoringWeights {
    const sum =
      weights.visual + weights.behavioral + weights.audio + weights.contextual;

    if (sum === 0) {
      return DEFAULT_WEIGHTS;
    }

    return {
      visual: weights.visual / sum,
      behavioral: weights.behavioral / sum,
      audio: weights.audio / sum,
      contextual: weights.contextual / sum,
    };
  }

  /**
   * Get component contribution breakdown
   */
  public getContributionBreakdown(
    components: Partial<ComponentScores>,
  ): {
    visual: number;
    behavioral: number;
    audio: number;
    contextual: number;
    total: number;
  } {
    const { visual, behavioral, audio, contextual } = components;

    return {
      visual:
        visual !== undefined && visual >= 0 ? visual * this.weights.visual : 0,
      behavioral:
        behavioral !== undefined && behavioral >= 0
          ? behavioral * this.weights.behavioral
          : 0,
      audio:
        audio !== undefined && audio >= 0 ? audio * this.weights.audio : 0,
      contextual:
        contextual !== undefined && contextual >= 0
          ? contextual * this.weights.contextual
          : 0,
      total: this.calculate(components),
    };
  }

  /**
   * Validate component scores
   */
  public validateComponents(components: Partial<ComponentScores>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(components)) {
      if (value !== undefined) {
        if (typeof value !== 'number') {
          errors.push(`${key} must be a number`);
        } else if (value < 0 || value > 100) {
          errors.push(`${key} must be between 0 and 100`);
        } else if (Number.isNaN(value)) {
          errors.push(`${key} cannot be NaN`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
