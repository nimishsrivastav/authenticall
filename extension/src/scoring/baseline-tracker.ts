/**
 * Baseline Tracker
 * Establishes and maintains session baseline for anomaly detection
 */

import {
  BaselineData,
  BaselineConfig,
  DEFAULT_BASELINE_CONFIG,
  ComponentScores,
  TrustScoreResult,
} from './types';

export class BaselineTracker {
  private config: BaselineConfig;
  private baseline: BaselineData | null = null;
  private establishmentScores: TrustScoreResult[] = [];
  private sessionStartTime: number | null = null;

  constructor(config: BaselineConfig = DEFAULT_BASELINE_CONFIG) {
    this.config = config;
  }

  /**
   * Start tracking for a new session
   */
  public startSession(sessionId: string): void {
    this.baseline = null;
    this.establishmentScores = [];
    this.sessionStartTime = Date.now();

    console.log(`[BaselineTracker] Started tracking for session: ${sessionId}`);
  }

  /**
   * Add score sample to baseline tracking
   */
  public addSample(score: TrustScoreResult): void {
    if (this.baseline?.isEstablished) {
      // Baseline already established, apply adaptive update
      this.adaptiveUpdate(score);
      return;
    }

    // Still establishing baseline
    this.establishmentScores.push(score);

    // Check if baseline can be established
    this.checkEstablishment();
  }

  /**
   * Check if baseline can be established
   */
  private checkEstablishment(): void {
    if (!this.sessionStartTime) return;

    const elapsed = Date.now() - this.sessionStartTime;
    const hasEnoughSamples =
      this.establishmentScores.length >= this.config.minSamples;
    const hasEnoughTime = elapsed >= this.config.establishmentDuration;

    // Establish baseline if we have enough samples AND enough time
    // OR if we have significantly more samples than minimum
    if (
      (hasEnoughSamples && hasEnoughTime) ||
      this.establishmentScores.length >= this.config.minSamples * 2
    ) {
      this.establishBaseline();
    }
  }

  /**
   * Establish the baseline from collected samples
   */
  private establishBaseline(): void {
    const scores = this.establishmentScores;
    const overallScores = scores.map((s) => s.overall);

    // Calculate baseline statistics
    const averageScore = this.calculateAverage(overallScores);
    const standardDeviation = this.calculateStandardDeviation(overallScores);

    // Calculate component averages
    const componentAverages = this.calculateComponentAverages(scores);

    this.baseline = {
      sessionId: crypto.randomUUID(),
      establishedAt: Date.now(),
      samples: scores.length,
      averageScore,
      standardDeviation,
      componentAverages,
      isEstablished: true,
      minEstablishmentSamples: this.config.minSamples,
      establishmentDuration: this.config.establishmentDuration,
    };

    console.log(
      `[BaselineTracker] Baseline established - Average: ${averageScore.toFixed(1)}, StdDev: ${standardDeviation.toFixed(1)}`,
    );
  }

  /**
   * Adaptive update of baseline with new score
   */
  private adaptiveUpdate(score: TrustScoreResult): void {
    if (!this.baseline) return;

    const rate = this.config.adaptiveUpdateRate;

    // Update average using exponential moving average
    this.baseline.averageScore =
      (1 - rate) * this.baseline.averageScore + rate * score.overall;

    // Update component averages
    const components = score.components;
    if (components.visual >= 0) {
      this.baseline.componentAverages.visual =
        (1 - rate) * this.baseline.componentAverages.visual +
        rate * components.visual;
    }
    if (components.behavioral >= 0) {
      this.baseline.componentAverages.behavioral =
        (1 - rate) * this.baseline.componentAverages.behavioral +
        rate * components.behavioral;
    }
    if (components.audio >= 0) {
      this.baseline.componentAverages.audio =
        (1 - rate) * this.baseline.componentAverages.audio +
        rate * components.audio;
    }
    if (components.contextual >= 0) {
      this.baseline.componentAverages.contextual =
        (1 - rate) * this.baseline.componentAverages.contextual +
        rate * components.contextual;
    }

    this.baseline.samples++;
  }

  /**
   * Calculate average of values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = this.calculateAverage(values);
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.calculateAverage(squaredDiffs);

    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate component averages from score history
   */
  private calculateComponentAverages(
    scores: TrustScoreResult[],
  ): ComponentScores {
    const visuals: number[] = [];
    const behaviorals: number[] = [];
    const audios: number[] = [];
    const contextuals: number[] = [];

    for (const score of scores) {
      if (score.components.visual >= 0) {
        visuals.push(score.components.visual);
      }
      if (score.components.behavioral >= 0) {
        behaviorals.push(score.components.behavioral);
      }
      if (score.components.audio >= 0) {
        audios.push(score.components.audio);
      }
      if (score.components.contextual >= 0) {
        contextuals.push(score.components.contextual);
      }
    }

    return {
      visual: visuals.length > 0 ? this.calculateAverage(visuals) : 75,
      behavioral:
        behaviorals.length > 0 ? this.calculateAverage(behaviorals) : 75,
      audio: audios.length > 0 ? this.calculateAverage(audios) : 75,
      contextual:
        contextuals.length > 0 ? this.calculateAverage(contextuals) : 75,
    };
  }

  /**
   * Get current baseline
   */
  public getBaseline(): BaselineData | null {
    return this.baseline ? { ...this.baseline } : null;
  }

  /**
   * Check if baseline is established
   */
  public isEstablished(): boolean {
    return this.baseline?.isEstablished ?? false;
  }

  /**
   * Get establishment progress
   */
  public getEstablishmentProgress(): {
    samplesCollected: number;
    samplesRequired: number;
    timeElapsed: number;
    timeRequired: number;
    percentComplete: number;
  } {
    const samplesCollected = this.establishmentScores.length;
    const samplesRequired = this.config.minSamples;
    const timeElapsed = this.sessionStartTime
      ? Date.now() - this.sessionStartTime
      : 0;
    const timeRequired = this.config.establishmentDuration;

    const sampleProgress = Math.min(samplesCollected / samplesRequired, 1);
    const timeProgress = Math.min(timeElapsed / timeRequired, 1);
    const percentComplete = Math.min(sampleProgress, timeProgress) * 100;

    return {
      samplesCollected,
      samplesRequired,
      timeElapsed,
      timeRequired,
      percentComplete: Math.round(percentComplete),
    };
  }

  /**
   * Calculate deviation from baseline
   */
  public calculateDeviation(currentScore: number): {
    absolute: number;
    relative: number;
    sigmas: number;
  } | null {
    if (!this.baseline || !this.baseline.isEstablished) {
      return null;
    }

    const absolute = currentScore - this.baseline.averageScore;
    const relative =
      this.baseline.averageScore > 0
        ? absolute / this.baseline.averageScore
        : 0;
    const sigmas =
      this.baseline.standardDeviation > 0
        ? absolute / this.baseline.standardDeviation
        : 0;

    return {
      absolute: Math.round(absolute * 100) / 100,
      relative: Math.round(relative * 1000) / 1000,
      sigmas: Math.round(sigmas * 100) / 100,
    };
  }

  /**
   * Reset baseline
   */
  public reset(): void {
    this.baseline = null;
    this.establishmentScores = [];
    this.sessionStartTime = null;
  }

  /**
   * Force establish baseline with current samples
   */
  public forceEstablish(): boolean {
    if (this.establishmentScores.length < 3) {
      console.warn(
        '[BaselineTracker] Cannot force establish with fewer than 3 samples',
      );
      return false;
    }

    this.establishBaseline();
    return true;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<BaselineConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): BaselineConfig {
    return { ...this.config };
  }

  /**
   * Check if baseline is stale
   */
  public isBaselineStale(): boolean {
    if (!this.baseline) return false;

    const age = Date.now() - this.baseline.establishedAt;
    return age > this.config.maxAge;
  }

  /**
   * Get baseline age in milliseconds
   */
  public getBaselineAge(): number | null {
    if (!this.baseline) return null;
    return Date.now() - this.baseline.establishedAt;
  }

  /**
   * Get baseline summary
   */
  public getSummary(): {
    isEstablished: boolean;
    averageScore: number | null;
    standardDeviation: number | null;
    samples: number;
    age: number | null;
    isStale: boolean;
  } {
    return {
      isEstablished: this.baseline?.isEstablished ?? false,
      averageScore: this.baseline?.averageScore ?? null,
      standardDeviation: this.baseline?.standardDeviation ?? null,
      samples: this.baseline?.samples ?? this.establishmentScores.length,
      age: this.getBaselineAge(),
      isStale: this.isBaselineStale(),
    };
  }
}
