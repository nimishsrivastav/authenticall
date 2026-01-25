/**
 * Anomaly Detector
 * Detects sudden score drops, spikes, and unusual patterns
 */

import { AlertSeverity } from '../shared/types';
import {
  AnomalyResult,
  AnomalyConfig,
  DEFAULT_ANOMALY_CONFIG,
  BaselineData,
} from './types';

export class AnomalyDetector {
  private config: AnomalyConfig;
  private scoreHistory: number[] = [];
  private timestampHistory: number[] = [];
  private maxHistoryLength: number = 100;
  private lastLowScoreTime: number | null = null;

  constructor(config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG) {
    this.config = config;
  }

  /**
   * Detect anomalies in the current score
   */
  public detect(
    currentScore: number,
    baseline?: BaselineData,
  ): AnomalyResult {
    if (!this.config.enabled) {
      return { isAnomaly: false };
    }

    const timestamp = Date.now();

    // Add to history
    this.scoreHistory.push(currentScore);
    this.timestampHistory.push(timestamp);

    // Trim history
    if (this.scoreHistory.length > this.maxHistoryLength) {
      this.scoreHistory.shift();
      this.timestampHistory.shift();
    }

    // Run all anomaly checks
    const anomalies: AnomalyResult[] = [];

    // Check for sudden drop
    const suddenDrop = this.detectSuddenDrop(currentScore);
    if (suddenDrop.isAnomaly) {
      anomalies.push(suddenDrop);
    }

    // Check for sudden spike
    const suddenSpike = this.detectSuddenSpike(currentScore);
    if (suddenSpike.isAnomaly) {
      anomalies.push(suddenSpike);
    }

    // Check for volatility
    const volatility = this.detectVolatility();
    if (volatility.isAnomaly) {
      anomalies.push(volatility);
    }

    // Check for sustained low score
    const sustainedLow = this.detectSustainedLow(currentScore, timestamp);
    if (sustainedLow.isAnomaly) {
      anomalies.push(sustainedLow);
    }

    // Check for baseline deviation
    if (baseline && baseline.isEstablished) {
      const baselineDeviation = this.detectBaselineDeviation(
        currentScore,
        baseline,
      );
      if (baselineDeviation.isAnomaly) {
        anomalies.push(baselineDeviation);
      }
    }

    // Return the most severe anomaly
    if (anomalies.length === 0) {
      return { isAnomaly: false };
    }

    // Sort by severity and return the most severe
    const severityOrder: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];
    anomalies.sort(
      (a, b) =>
        severityOrder.indexOf(a.severity || 'low') -
        severityOrder.indexOf(b.severity || 'low'),
    );

    return anomalies[0]!;
  }

  /**
   * Detect sudden score drop
   */
  private detectSuddenDrop(currentScore: number): AnomalyResult {
    if (this.scoreHistory.length < 2) {
      return { isAnomaly: false };
    }

    const previousScore = this.scoreHistory[this.scoreHistory.length - 2]!;
    const drop = previousScore - currentScore;

    if (drop >= this.config.suddenDropThreshold) {
      const severity = this.getSeverityFromDrop(drop);
      return {
        isAnomaly: true,
        type: 'sudden_drop',
        severity,
        deviation: drop,
        message: `Trust score dropped by ${drop} points (from ${previousScore} to ${currentScore})`,
      };
    }

    return { isAnomaly: false };
  }

  /**
   * Detect sudden score spike
   */
  private detectSuddenSpike(currentScore: number): AnomalyResult {
    if (this.scoreHistory.length < 2) {
      return { isAnomaly: false };
    }

    const previousScore = this.scoreHistory[this.scoreHistory.length - 2]!;
    const increase = currentScore - previousScore;

    if (increase >= this.config.suddenSpikeThreshold) {
      // Sudden increases can indicate manipulation or recovered connection
      return {
        isAnomaly: true,
        type: 'sudden_spike',
        severity: 'medium',
        deviation: increase,
        message: `Trust score spiked by ${increase} points (from ${previousScore} to ${currentScore})`,
      };
    }

    return { isAnomaly: false };
  }

  /**
   * Detect high volatility in scores
   */
  private detectVolatility(): AnomalyResult {
    if (this.scoreHistory.length < this.config.volatilityWindow) {
      return { isAnomaly: false };
    }

    const recentScores = this.scoreHistory.slice(-this.config.volatilityWindow);
    const stdDev = this.calculateStandardDeviation(recentScores);

    if (stdDev > this.config.volatilityThreshold) {
      return {
        isAnomaly: true,
        type: 'volatility',
        severity: 'medium',
        deviation: stdDev,
        message: `High score volatility detected (std dev: ${stdDev.toFixed(1)})`,
      };
    }

    return { isAnomaly: false };
  }

  /**
   * Detect sustained low score
   */
  private detectSustainedLow(
    currentScore: number,
    timestamp: number,
  ): AnomalyResult {
    if (currentScore < this.config.sustainedLowThreshold) {
      if (this.lastLowScoreTime === null) {
        this.lastLowScoreTime = timestamp;
      }

      const lowDuration = timestamp - this.lastLowScoreTime;

      if (lowDuration >= this.config.sustainedLowDuration) {
        return {
          isAnomaly: true,
          type: 'sustained_low',
          severity: 'high',
          deviation: this.config.sustainedLowThreshold - currentScore,
          message: `Trust score has been below ${this.config.sustainedLowThreshold} for ${Math.round(lowDuration / 1000)}s`,
        };
      }
    } else {
      // Reset low score tracking
      this.lastLowScoreTime = null;
    }

    return { isAnomaly: false };
  }

  /**
   * Detect deviation from baseline
   */
  private detectBaselineDeviation(
    currentScore: number,
    baseline: BaselineData,
  ): AnomalyResult {
    const deviation = Math.abs(currentScore - baseline.averageScore);
    const deviationPercent = deviation / baseline.averageScore;

    if (deviationPercent > this.config.baselineDeviationThreshold) {
      const direction = currentScore < baseline.averageScore ? 'below' : 'above';
      const severity =
        deviationPercent > this.config.baselineDeviationThreshold * 2
          ? 'high'
          : 'medium';

      return {
        isAnomaly: true,
        type: 'baseline_deviation',
        severity,
        deviation: deviationPercent * 100,
        message: `Score is ${Math.round(deviationPercent * 100)}% ${direction} baseline (${currentScore} vs baseline ${Math.round(baseline.averageScore)})`,
      };
    }

    return { isAnomaly: false };
  }

  /**
   * Get severity based on score drop magnitude
   */
  private getSeverityFromDrop(drop: number): AlertSeverity {
    if (drop >= 60) {
      return 'critical';
    } else if (drop >= 50) {
      return 'high';
    } else if (drop >= 40) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / n;

    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnomalyConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): AnomalyConfig {
    return { ...this.config };
  }

  /**
   * Get score history
   */
  public getHistory(): { scores: number[]; timestamps: number[] } {
    return {
      scores: [...this.scoreHistory],
      timestamps: [...this.timestampHistory],
    };
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.scoreHistory = [];
    this.timestampHistory = [];
    this.lastLowScoreTime = null;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    count: number;
    average: number;
    min: number;
    max: number;
    standardDeviation: number;
  } {
    if (this.scoreHistory.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
      };
    }

    const count = this.scoreHistory.length;
    const average =
      this.scoreHistory.reduce((sum, val) => sum + val, 0) / count;
    const min = Math.min(...this.scoreHistory);
    const max = Math.max(...this.scoreHistory);
    const standardDeviation = this.calculateStandardDeviation(this.scoreHistory);

    return {
      count,
      average: Math.round(average * 100) / 100,
      min,
      max,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
    };
  }

  /**
   * Check if anomaly detection is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable/disable anomaly detection
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}
