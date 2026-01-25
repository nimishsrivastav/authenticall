/**
 * Trust Scorer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrustScorer, createTrustScorer } from '../trust-scorer';

describe('TrustScorer', () => {
  let scorer: TrustScorer;

  beforeEach(() => {
    scorer = createTrustScorer();
  });

  describe('calculateScore', () => {
    it('should calculate trust score from analysis input', () => {
      const result = scorer.calculateScore({
        visual: { score: 80, confidence: 0.9 },
        behavioral: { score: 90, confidence: 0.8 },
      });

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.level).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should determine correct trust level', () => {
      const safeResult = scorer.calculateScore({
        visual: { score: 95, confidence: 0.9 },
        behavioral: { score: 95, confidence: 0.9 },
      });
      expect(safeResult.level).toBe('safe');

      const cautionResult = scorer.calculateScore({
        visual: { score: 60, confidence: 0.9 },
        behavioral: { score: 60, confidence: 0.9 },
      });
      expect(cautionResult.level).toBe('caution');

      const dangerResult = scorer.calculateScore({
        visual: { score: 30, confidence: 0.9 },
        behavioral: { score: 30, confidence: 0.9 },
      });
      expect(dangerResult.level).toBe('danger');
    });

    it('should track score history', () => {
      scorer.calculateScore({
        visual: { score: 80, confidence: 0.9 },
      });
      scorer.calculateScore({
        visual: { score: 85, confidence: 0.9 },
      });

      const history = scorer.getHistory();
      expect(history.length).toBe(2);
    });

    it('should detect anomalies', () => {
      // First score
      scorer.calculateScore({
        visual: { score: 90, confidence: 0.9 },
        behavioral: { score: 90, confidence: 0.9 },
      });

      // Sudden drop
      const result = scorer.calculateScore({
        visual: { score: 30, confidence: 0.9 },
        behavioral: { score: 30, confidence: 0.9 },
      });

      expect(result.isAnomaly).toBe(true);
    });
  });

  describe('score smoothing', () => {
    it('should apply smoothing when enabled', () => {
      scorer.setSmoothing(true, 0.3);

      // First score
      scorer.calculateScore({
        visual: { score: 90, confidence: 0.9 },
      });

      // Second score (much lower)
      const result = scorer.calculateScore({
        visual: { score: 50, confidence: 0.9 },
      });

      // With smoothing, should be higher than 50
      expect(result.overall).toBeGreaterThan(50);
    });

    it('should not apply smoothing when disabled', () => {
      scorer.setSmoothing(false);

      scorer.calculateScore({
        visual: { score: 90, confidence: 0.9 },
      });

      const result = scorer.calculateScore({
        visual: { score: 50, confidence: 0.9 },
      });

      // Without smoothing and only visual, score should be close to 50
      expect(result.components.visual).toBe(50);
    });
  });

  describe('session management', () => {
    it('should start and end sessions', () => {
      scorer.startSession('test-session');
      expect(scorer.getSessionId()).toBe('test-session');

      scorer.endSession();
      expect(scorer.getSessionId()).toBeNull();
    });

    it('should reset state on new session', () => {
      scorer.calculateScore({
        visual: { score: 80, confidence: 0.9 },
      });

      scorer.startSession('new-session');

      expect(scorer.getHistory().length).toBe(0);
    });
  });

  describe('trend calculation', () => {
    it('should detect improving trend', () => {
      scorer.calculateScore({ visual: { score: 60, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 70, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 80, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 85, confidence: 0.9 } });
      const result = scorer.calculateScore({
        visual: { score: 90, confidence: 0.9 },
      });

      expect(result.trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      scorer.calculateScore({ visual: { score: 90, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 80, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 70, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 60, confidence: 0.9 } });
      const result = scorer.calculateScore({
        visual: { score: 50, confidence: 0.9 },
      });

      expect(result.trend).toBe('declining');
    });

    it('should detect stable trend', () => {
      scorer.calculateScore({ visual: { score: 75, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 76, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 74, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 75, confidence: 0.9 } });
      const result = scorer.calculateScore({
        visual: { score: 76, confidence: 0.9 },
      });

      expect(result.trend).toBe('stable');
    });
  });

  describe('baseline tracking', () => {
    it('should track baseline establishment progress', () => {
      scorer.startSession('test');

      const progress = scorer.getBaselineProgress();
      expect(progress.samplesCollected).toBe(0);
      expect(progress.percentComplete).toBe(0);
    });

    it('should update baseline with samples', () => {
      scorer.startSession('test');

      for (let i = 0; i < 5; i++) {
        scorer.calculateScore({ visual: { score: 80, confidence: 0.9 } });
      }

      const progress = scorer.getBaselineProgress();
      expect(progress.samplesCollected).toBe(5);
    });
  });

  describe('statistics', () => {
    it('should provide statistics', () => {
      scorer.calculateScore({ visual: { score: 80, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 70, confidence: 0.9 } });
      scorer.calculateScore({ visual: { score: 90, confidence: 0.9 } });

      const stats = scorer.getStatistics();

      expect(stats.count).toBe(3);
      expect(stats.average).toBeGreaterThan(0);
      expect(stats.min).toBeLessThanOrEqual(stats.max);
    });
  });

  describe('configuration', () => {
    it('should update weights', () => {
      scorer.updateWeights({ visual: 0.5 });
      // No error should occur
    });

    it('should update thresholds', () => {
      scorer.updateThresholds({ safe: 90 });

      const info = scorer.getThresholdInfo();
      expect(info.thresholds.safe).toBe(90);
    });

    it('should update anomaly config', () => {
      scorer.updateAnomalyConfig({ enabled: false });
      expect(scorer.isAnomalyDetectionEnabled()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      scorer.startSession('test');
      scorer.calculateScore({ visual: { score: 80, confidence: 0.9 } });

      scorer.reset();

      expect(scorer.getHistory().length).toBe(0);
      expect(scorer.getSessionId()).toBeNull();
    });
  });
});
