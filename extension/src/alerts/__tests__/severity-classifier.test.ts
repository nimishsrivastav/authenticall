/**
 * Severity Classifier Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SeverityClassifier } from '../severity-classifier';

describe('SeverityClassifier', () => {
  let classifier: SeverityClassifier;

  beforeEach(() => {
    classifier = new SeverityClassifier();
  });

  describe('classify', () => {
    it('should classify critical severity for very low scores', () => {
      const result = classifier.classify({
        trustScore: 20,
        confidence: 0.9,
        indicators: [],
        isAnomaly: false,
        category: 'visual',
      });

      expect(result.severity).toBe('critical');
      expect(result.actionRequired).toBe(true);
    });

    it('should classify high severity for low scores', () => {
      const result = classifier.classify({
        trustScore: 40,
        confidence: 0.8,
        indicators: [],
        isAnomaly: false,
        category: 'visual',
      });

      expect(result.severity).toBe('high');
    });

    it('should classify medium severity for moderate scores', () => {
      const result = classifier.classify({
        trustScore: 60,
        confidence: 0.7,
        indicators: [],
        isAnomaly: false,
        category: 'visual',
      });

      expect(result.severity).toBe('medium');
    });

    it('should classify low severity for high scores', () => {
      const result = classifier.classify({
        trustScore: 85,
        confidence: 0.9,
        indicators: [],
        isAnomaly: false,
        category: 'visual',
      });

      expect(result.severity).toBe('low');
    });

    it('should increase severity for critical indicators', () => {
      const withoutIndicators = classifier.classify({
        trustScore: 50,
        confidence: 0.8,
        indicators: [],
        isAnomaly: false,
        category: 'visual',
      });

      const withIndicators = classifier.classify({
        trustScore: 50,
        confidence: 0.8,
        indicators: [{ type: 'deepfake', severity: 'critical' }],
        isAnomaly: false,
        category: 'visual',
      });

      expect(classifier.compareSeverity(withIndicators.severity, withoutIndicators.severity))
        .toBeGreaterThanOrEqual(0);
    });

    it('should increase severity for anomalies', () => {
      const withoutAnomaly = classifier.classify({
        trustScore: 50,
        confidence: 0.8,
        indicators: [],
        isAnomaly: false,
        category: 'visual',
      });

      const withAnomaly = classifier.classify({
        trustScore: 50,
        confidence: 0.8,
        indicators: [],
        isAnomaly: true,
        anomalyType: 'sudden_drop',
        category: 'visual',
      });

      expect(classifier.compareSeverity(withAnomaly.severity, withoutAnomaly.severity))
        .toBeGreaterThanOrEqual(0);
    });

    it('should provide factors explaining classification', () => {
      const result = classifier.classify({
        trustScore: 30,
        confidence: 0.9,
        indicators: [{ type: 'urgency', severity: 'high' }],
        isAnomaly: true,
        anomalyType: 'sudden_drop',
        category: 'behavioral',
      });

      expect(result.factors.length).toBeGreaterThan(0);
    });
  });

  describe('quickClassify', () => {
    it('should quickly classify based on score and confidence', () => {
      expect(classifier.quickClassify(20, 0.9)).toBe('critical');
      expect(classifier.quickClassify(40, 0.8)).toBe('high');
      expect(classifier.quickClassify(60, 0.7)).toBe('medium');
      expect(classifier.quickClassify(90, 0.9)).toBe('low');
    });

    it('should factor in confidence', () => {
      // Same score, different confidence
      const highConfidence = classifier.quickClassify(55, 0.9);
      const lowConfidence = classifier.quickClassify(55, 0.3);

      // Lower confidence should result in less severe (or equal) classification
      expect(classifier.compareSeverity(highConfidence, lowConfidence))
        .toBeGreaterThanOrEqual(0);
    });
  });

  describe('shouldGenerateAlert', () => {
    it('should return true for scores below threshold', () => {
      expect(classifier.shouldGenerateAlert(30, 0.9, 'low')).toBe(true);
      expect(classifier.shouldGenerateAlert(50, 0.8, 'medium')).toBe(true);
    });

    it('should return false for safe scores', () => {
      expect(classifier.shouldGenerateAlert(95, 0.9, 'high')).toBe(false);
    });

    it('should respect minimum severity parameter', () => {
      // Medium score but requiring high severity minimum
      expect(classifier.shouldGenerateAlert(60, 0.9, 'critical')).toBe(false);
    });
  });

  describe('compareSeverity', () => {
    it('should compare severities correctly', () => {
      expect(classifier.compareSeverity('critical', 'high')).toBeGreaterThan(0);
      expect(classifier.compareSeverity('high', 'medium')).toBeGreaterThan(0);
      expect(classifier.compareSeverity('medium', 'low')).toBeGreaterThan(0);
      expect(classifier.compareSeverity('low', 'low')).toBe(0);
      expect(classifier.compareSeverity('low', 'critical')).toBeLessThan(0);
    });
  });

  describe('getSeverityDisplayInfo', () => {
    it('should return display info for each severity', () => {
      const critical = classifier.getSeverityDisplayInfo('critical');
      expect(critical.label).toBe('Critical');
      expect(critical.priority).toBe(4);
      expect(critical.icon).toBeDefined();
      expect(critical.color).toBeDefined();

      const low = classifier.getSeverityDisplayInfo('low');
      expect(low.label).toBe('Low');
      expect(low.priority).toBe(1);
    });
  });

  describe('updateRules', () => {
    it('should update classification rules', () => {
      classifier.updateRules({ criticalScoreThreshold: 40 });

      const rules = classifier.getRules();
      expect(rules.criticalScoreThreshold).toBe(40);
    });
  });
});
