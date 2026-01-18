/**
 * Fusion Analyzer
 * Combines visual and behavioral analysis for comprehensive trust assessment
 */

import {
  VisualAnalysisResult,
//   VisualIndicator,
} from './visual-analyzer';
import {
  BehavioralAnalysisResult,
//   BehavioralIndicator,
} from './behavioral-analyzer';
import { TrustScoreSnapshot, TrustLevel, Alert } from '../shared/types';

export interface FusionAnalysisResult {
  trustScore: TrustScoreSnapshot;
  alerts: Alert[];
  summary: string;
  timestamp: number;
}

export interface FusionWeights {
  visual: number;
  behavioral: number;
  contextual: number;
}

export class FusionAnalyzer {
  private weights: FusionWeights = {
    visual: 0.4, // 40% weight on visual analysis
    behavioral: 0.5, // 50% weight on behavioral analysis
    contextual: 0.1, // 10% weight on contextual factors
  };

  private visualHistory: VisualAnalysisResult[] = [];
  private behavioralHistory: BehavioralAnalysisResult[] = [];
  private maxHistoryLength: number = 20;

  /**
   * Fuse visual and behavioral analysis into comprehensive trust score
   */
  public fuseAnalysis(
    visual?: VisualAnalysisResult,
    behavioral?: BehavioralAnalysisResult,
  ): FusionAnalysisResult {
    // Store in history
    if (visual) {
      this.visualHistory.push(visual);
      if (this.visualHistory.length > this.maxHistoryLength) {
        this.visualHistory.shift();
      }
    }

    if (behavioral) {
      this.behavioralHistory.push(behavioral);
      if (this.behavioralHistory.length > this.maxHistoryLength) {
        this.behavioralHistory.shift();
      }
    }

    // Calculate component scores
    const visualScore = this.calculateVisualScore(visual);
    const behavioralScore = this.calculateBehavioralScore(behavioral);
    const contextualScore = this.calculateContextualScore();

    // Calculate overall trust score
    const overall = Math.round(
      visualScore * this.weights.visual +
        behavioralScore * this.weights.behavioral +
        contextualScore * this.weights.contextual,
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(visual, behavioral);

    // Determine trust level
    const level = this.determineTrustLevel(overall);

    // Generate alerts
    const alerts = this.generateAlerts(visual, behavioral, overall);

    // Generate summary
    const summary = this.generateSummary(visual, behavioral, overall, level);

    return {
      trustScore: {
        timestamp: Date.now(),
        overall,
        visual: Math.round(visualScore),
        audio: 75, // Placeholder - will be implemented with audio analysis
        behavioral: Math.round(behavioralScore),
        confidence,
        level,
      },
      alerts,
      summary,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate visual component score
   */
  private calculateVisualScore(visual?: VisualAnalysisResult): number {
    if (!visual) {
      // Use historical average if no current visual data
      if (this.visualHistory.length > 0) {
        const avgScore =
          this.visualHistory.reduce((sum, v) => sum + v.trustScore, 0) /
          this.visualHistory.length;
        return avgScore;
      }
      return 75; // Neutral default
    }

    // Weight recent analysis more heavily
    return visual.trustScore;
  }

  /**
   * Calculate behavioral component score
   */
  private calculateBehavioralScore(
    behavioral?: BehavioralAnalysisResult,
  ): number {
    if (!behavioral) {
      // Use historical average
      if (this.behavioralHistory.length > 0) {
        const avgScore =
          this.behavioralHistory.reduce((sum, b) => sum + b.trustScore, 0) /
          this.behavioralHistory.length;
        return avgScore;
      }
      return 75; // Neutral default
    }

    return behavioral.trustScore;
  }

  /**
   * Calculate contextual score based on trends
   */
  private calculateContextualScore(): number {
    // Analyze trends in visual and behavioral scores
    const visualTrend = this.calculateTrend(
      this.visualHistory.map((v) => v.trustScore),
    );
    const behavioralTrend = this.calculateTrend(
      this.behavioralHistory.map((b) => b.trustScore),
    );

    // If scores are declining, reduce contextual score
    const trendPenalty = Math.min(visualTrend, behavioralTrend);

    return 75 + trendPenalty; // Base 75, adjusted by trend
  }

  /**
   * Calculate trend in scores (positive = improving, negative = declining)
   */
  private calculateTrend(scores: number[]): number {
    if (scores.length < 3) {
      return 0; // Not enough data
    }

    // Simple linear regression
    const recentScores = scores.slice(-5);
    const n = recentScores.length;
    const xSum = (n * (n + 1)) / 2;
    const ySum = recentScores.reduce((sum, score) => sum + score, 0);
    const xySum = recentScores.reduce(
      (sum, score, idx) => sum + score * (idx + 1),
      0,
    );
    const xxSum = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);

    // Convert slope to penalty/bonus (-10 to +10)
    return Math.max(-10, Math.min(10, slope));
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    visual?: VisualAnalysisResult,
    behavioral?: BehavioralAnalysisResult,
  ): number {
    const confidences: number[] = [];

    if (visual) {
      confidences.push(visual.confidence);
    }

    if (behavioral) {
      confidences.push(behavioral.confidence);
    }

    // Add historical confidence average
    if (this.visualHistory.length > 0) {
      const avgVisualConf =
        this.visualHistory.reduce((sum, v) => sum + v.confidence, 0) /
        this.visualHistory.length;
      confidences.push(avgVisualConf);
    }

    if (this.behavioralHistory.length > 0) {
      const avgBehavioralConf =
        this.behavioralHistory.reduce((sum, b) => sum + b.confidence, 0) /
        this.behavioralHistory.length;
      confidences.push(avgBehavioralConf);
    }

    if (confidences.length === 0) {
      return 0.5; // Default medium confidence
    }

    // Average of all confidences
    const avgConfidence =
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    return Math.max(0, Math.min(1, avgConfidence));
  }

  /**
   * Determine trust level from score
   */
  private determineTrustLevel(score: number): TrustLevel {
    if (score >= 85) {
      return 'safe';
    } else if (score >= 50) {
      return 'caution';
    } else {
      return 'danger';
    }
  }

  /**
   * Generate alerts based on analysis
   */
  private generateAlerts(
    visual?: VisualAnalysisResult,
    behavioral?: BehavioralAnalysisResult,
    overallScore?: number,
  ): Alert[] {
    const alerts: Alert[] = [];

    // Check visual indicators
    if (visual) {
      for (const indicator of visual.indicators) {
        if (indicator.severity === 'high' || indicator.severity === 'medium') {
          alerts.push({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            severity: this.mapSeverity(indicator.severity),
            category: 'visual',
            title: `Visual Anomaly: ${indicator.type}`,
            message: indicator.description,
            actionRequired: indicator.severity === 'high',
            dismissed: false,
          });
        }
      }
    }

    // Check behavioral indicators
    if (behavioral) {
      for (const indicator of behavioral.indicators) {
        if (
          indicator.severity === 'critical' ||
          indicator.severity === 'high' ||
          indicator.severity === 'medium'
        ) {
          alerts.push({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            severity: this.mapSeverity(indicator.severity),
            category: 'behavioral',
            title: `Behavioral Alert: ${indicator.type}`,
            message: indicator.description,
            actionRequired: indicator.severity === 'critical',
            dismissed: false,
          });
        }
      }

      // Check for high-risk intent
      if (
        behavioral.intent.riskLevel === 'high' ||
        behavioral.intent.riskLevel === 'critical'
      ) {
        alerts.push({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          severity:
            behavioral.intent.riskLevel === 'critical' ? 'critical' : 'high',
          category: 'behavioral',
          title: `Suspicious Intent Detected`,
          message: behavioral.intent.description,
          details: `Category: ${behavioral.intent.category}`,
          actionRequired: true,
          dismissed: false,
        });
      }
    }

    // Check overall trust score
    if (overallScore !== undefined && overallScore < 50) {
      alerts.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        severity: overallScore < 30 ? 'critical' : 'high',
        category: 'fusion',
        title: 'Low Trust Score',
        message: `Overall trust score is critically low: ${overallScore}/100`,
        details: 'Multiple suspicious indicators detected across analysis',
        actionRequired: true,
        dismissed: false,
      });
    }

    return alerts;
  }

  /**
   * Map severity levels
   */
  private mapSeverity(
    severity: 'low' | 'medium' | 'high' | 'critical',
  ): 'low' | 'medium' | 'high' | 'critical' {
    return severity;
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    visual?: VisualAnalysisResult,
    behavioral?: BehavioralAnalysisResult,
    score?: number,
    level?: TrustLevel,
  ): string {
    const parts: string[] = [];

    if (level === 'safe') {
      parts.push('✅ Call appears authentic and safe.');
    } else if (level === 'caution') {
      parts.push('⚠️ Some suspicious indicators detected. Exercise caution.');
    } else if (level === 'danger') {
      parts.push(
        '🚨 ALERT: Multiple red flags detected. This may be a deepfake or social engineering attack.',
      );
    }

    if (visual && visual.indicators.length > 0) {
      const highSeverity = visual.indicators.filter(
        (i) => i.severity === 'high',
      ).length;
      if (highSeverity > 0) {
        parts.push(`${highSeverity} visual anomalies detected.`);
      }
    }

    if (behavioral && behavioral.indicators.length > 0) {
      const criticalIndicators = behavioral.indicators.filter(
        (i) => i.severity === 'critical' || i.severity === 'high',
      ).length;
      if (criticalIndicators > 0) {
        parts.push(
          `${criticalIndicators} behavioral red flags identified.`,
        );
      }
    }

    if (score !== undefined) {
      parts.push(`Trust score: ${score}/100`);
    }

    return parts.join(' ');
  }

  /**
   * Update fusion weights
   */
  public updateWeights(weights: Partial<FusionWeights>): void {
    this.weights = { ...this.weights, ...weights };

    // Normalize weights to sum to 1.0
    const sum =
      this.weights.visual + this.weights.behavioral + this.weights.contextual;
    this.weights.visual /= sum;
    this.weights.behavioral /= sum;
    this.weights.contextual /= sum;
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.visualHistory = [];
    this.behavioralHistory = [];
  }

  /**
   * Get analysis history
   */
  public getHistory(): {
    visual: VisualAnalysisResult[];
    behavioral: BehavioralAnalysisResult[];
  } {
    return {
      visual: [...this.visualHistory],
      behavioral: [...this.behavioralHistory],
    };
  }
}