/**
 * Severity Classifier
 * Classifies alerts into severity levels based on multiple factors
 */

import { AlertSeverity } from '../shared/types';
import {
  SeverityInput,
  SeverityClassificationResult,
  SeverityRules,
  DEFAULT_SEVERITY_RULES,
} from './types';

export class SeverityClassifier {
  private rules: SeverityRules;

  constructor(rules: SeverityRules = DEFAULT_SEVERITY_RULES) {
    this.rules = rules;
  }

  /**
   * Classify severity based on input factors
   */
  public classify(input: SeverityInput): SeverityClassificationResult {
    const factors: string[] = [];
    let baseSeverity = this.getBaseSeverityFromScore(input.trustScore);
    let severityScore = this.getSeverityScore(baseSeverity);

    // Factor in confidence
    if (input.confidence >= 0.8) {
      factors.push('High confidence analysis');
      severityScore += 1;
    } else if (input.confidence < 0.5) {
      factors.push('Low confidence - results uncertain');
      severityScore -= 1;
    }

    // Factor in indicators
    const indicatorSeverity = this.analyzeIndicators(input.indicators);
    if (indicatorSeverity.criticalCount > 0) {
      factors.push(`${indicatorSeverity.criticalCount} critical indicator(s)`);
      severityScore += 2;
    }
    if (indicatorSeverity.highCount > 0) {
      factors.push(`${indicatorSeverity.highCount} high-risk indicator(s)`);
      severityScore += 1;
    }

    // Factor in anomaly detection
    if (input.isAnomaly) {
      factors.push(`Anomaly detected: ${input.anomalyType || 'unknown'}`);
      if (input.anomalyType === 'sudden_drop') {
        severityScore += 2;
      } else if (input.anomalyType === 'sustained_low') {
        severityScore += 1;
      }
    }

    // Factor in category-specific rules
    const categorySeverity = this.applyCategoryRules(input);
    if (categorySeverity) {
      factors.push(categorySeverity.reason);
      severityScore += categorySeverity.adjustment;
    }

    // Convert score back to severity
    const finalSeverity = this.scoreToSeverity(severityScore);

    // Determine if action is required
    const actionRequired = this.isActionRequired(finalSeverity, input);

    // Calculate classification confidence
    const classificationConfidence = this.calculateClassificationConfidence(
      input,
      factors.length,
    );

    return {
      severity: finalSeverity,
      confidence: classificationConfidence,
      factors,
      actionRequired,
    };
  }

  /**
   * Get base severity from trust score
   */
  private getBaseSeverityFromScore(score: number): AlertSeverity {
    if (score < this.rules.criticalScoreThreshold) {
      return 'critical';
    } else if (score < this.rules.highScoreThreshold) {
      return 'high';
    } else if (score < this.rules.mediumScoreThreshold) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Convert severity to numeric score for calculations
   */
  private getSeverityScore(severity: AlertSeverity): number {
    switch (severity) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Convert numeric score back to severity
   */
  private scoreToSeverity(score: number): AlertSeverity {
    if (score >= 4) return 'critical';
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * Analyze indicators for severity impact
   */
  private analyzeIndicators(
    indicators: Array<{ type: string; severity: string }>,
  ): { criticalCount: number; highCount: number } {
    let criticalCount = 0;
    let highCount = 0;

    for (const indicator of indicators) {
      const type = indicator.type.toLowerCase();
      const severity = indicator.severity.toLowerCase();

      // Check if indicator type is in critical list
      if (this.rules.criticalIndicatorTypes.some((t) => type.includes(t))) {
        criticalCount++;
      }
      // Check if indicator type is in high list
      else if (this.rules.highIndicatorTypes.some((t) => type.includes(t))) {
        highCount++;
      }
      // Also consider the indicator's own severity
      else if (severity === 'critical') {
        criticalCount++;
      } else if (severity === 'high') {
        highCount++;
      }
    }

    return { criticalCount, highCount };
  }

  /**
   * Apply category-specific severity rules
   */
  private applyCategoryRules(
    input: SeverityInput,
  ): { reason: string; adjustment: number } | null {
    switch (input.category) {
      case 'visual':
        if (input.trustScore < 40 && input.confidence > 0.7) {
          return {
            reason: 'Visual deepfake indicators detected with high confidence',
            adjustment: 1,
          };
        }
        break;

      case 'behavioral':
        // Behavioral analysis warrants extra attention
        if (input.trustScore < 50) {
          return {
            reason: 'Social engineering patterns detected',
            adjustment: 1,
          };
        }
        break;

      case 'fusion':
        // Multiple analysis types showing issues is more serious
        if (input.indicators.length > 3) {
          return {
            reason: 'Multiple analysis types detected issues',
            adjustment: 1,
          };
        }
        break;

      default:
        break;
    }

    return null;
  }

  /**
   * Determine if immediate action is required
   */
  private isActionRequired(
    severity: AlertSeverity,
    input: SeverityInput,
  ): boolean {
    // Critical always requires action
    if (severity === 'critical') {
      return true;
    }

    // High with good confidence requires action
    if (severity === 'high' && input.confidence >= 0.7) {
      return true;
    }

    // Specific indicator types always require action
    const actionableTypes = ['impersonation', 'deepfake', 'social_engineering'];
    const hasActionableIndicator = input.indicators.some((i) =>
      actionableTypes.some((t) => i.type.toLowerCase().includes(t)),
    );

    return hasActionableIndicator;
  }

  /**
   * Calculate confidence in the classification
   */
  private calculateClassificationConfidence(
    input: SeverityInput,
    factorCount: number,
  ): number {
    let confidence = input.confidence;

    // More factors = more confident classification
    confidence += factorCount * 0.05;

    // Very low or very high scores are more certain
    if (input.trustScore < 20 || input.trustScore > 90) {
      confidence += 0.1;
    }

    // Multiple indicators increase confidence
    if (input.indicators.length >= 3) {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Quick classification for simple cases
   */
  public quickClassify(
    trustScore: number,
    confidence: number,
  ): AlertSeverity {
    const adjusted = trustScore * (0.8 + confidence * 0.2);

    if (adjusted < this.rules.criticalScoreThreshold) return 'critical';
    if (adjusted < this.rules.highScoreThreshold) return 'high';
    if (adjusted < this.rules.mediumScoreThreshold) return 'medium';
    return 'low';
  }

  /**
   * Check if alert should be generated
   */
  public shouldGenerateAlert(
    trustScore: number,
    confidence: number,
    minSeverity: AlertSeverity = 'low',
  ): boolean {
    const severity = this.quickClassify(trustScore, confidence);
    return this.getSeverityScore(severity) >= this.getSeverityScore(minSeverity);
  }

  /**
   * Update rules
   */
  public updateRules(newRules: Partial<SeverityRules>): void {
    this.rules = {
      ...this.rules,
      ...newRules,
    };
  }

  /**
   * Get rules
   */
  public getRules(): SeverityRules {
    return { ...this.rules };
  }

  /**
   * Compare severities
   */
  public compareSeverity(a: AlertSeverity, b: AlertSeverity): number {
    return this.getSeverityScore(a) - this.getSeverityScore(b);
  }

  /**
   * Get severity display info
   */
  public getSeverityDisplayInfo(severity: AlertSeverity): {
    label: string;
    color: string;
    icon: string;
    priority: number;
  } {
    switch (severity) {
      case 'critical':
        return {
          label: 'Critical',
          color: '#DC2626', // red-600
          icon: '🚨',
          priority: 4,
        };
      case 'high':
        return {
          label: 'High',
          color: '#EA580C', // orange-600
          icon: '⚠️',
          priority: 3,
        };
      case 'medium':
        return {
          label: 'Medium',
          color: '#CA8A04', // yellow-600
          icon: '⚡',
          priority: 2,
        };
      case 'low':
        return {
          label: 'Low',
          color: '#2563EB', // blue-600
          icon: 'ℹ️',
          priority: 1,
        };
      default:
        return {
          label: 'Unknown',
          color: '#6B7280', // gray-500
          icon: '❓',
          priority: 0,
        };
    }
  }
}
