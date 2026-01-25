/**
 * Weighted Calculator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WeightedCalculator } from '../weighted-calculator';
import { DEFAULT_WEIGHTS } from '../types';

describe('WeightedCalculator', () => {
  let calculator: WeightedCalculator;

  beforeEach(() => {
    calculator = new WeightedCalculator();
  });

  describe('calculate', () => {
    it('should calculate weighted score from all components', () => {
      const result = calculator.calculate({
        visual: 80,
        behavioral: 90,
        audio: 70,
        contextual: 75,
      });

      // With default weights: visual 35%, behavioral 45%, audio 10%, contextual 10%
      // Expected: 80*0.35 + 90*0.45 + 70*0.1 + 75*0.1 = 28 + 40.5 + 7 + 7.5 = 83
      expect(result).toBe(83);
    });

    it('should handle missing components by redistributing weight', () => {
      const result = calculator.calculate({
        visual: 80,
        behavioral: 90,
      });

      // Only visual and behavioral available
      // Weights normalized: visual 35/(35+45) = 0.4375, behavioral 45/(35+45) = 0.5625
      // Expected: 80*0.4375 + 90*0.5625 = 35 + 50.625 = 85.625 ≈ 86
      expect(result).toBeGreaterThan(80);
      expect(result).toBeLessThan(95);
    });

    it('should return neutral score when no components provided', () => {
      const result = calculator.calculate({});
      expect(result).toBe(75);
    });

    it('should clamp scores to 0-100 range', () => {
      const result = calculator.calculate({
        visual: 150,
        behavioral: 200,
      });
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should handle zero scores correctly', () => {
      const result = calculator.calculate({
        visual: 0,
        behavioral: 0,
        audio: 0,
        contextual: 0,
      });
      expect(result).toBe(0);
    });
  });

  describe('calculateWithPenalty', () => {
    it('should apply penalty for missing components', () => {
      const withoutPenalty = calculator.calculate({ visual: 80 });
      const withPenalty = calculator.calculateWithPenalty({ visual: 80 });

      expect(withPenalty).toBeLessThan(withoutPenalty);
    });

    it('should apply no penalty when all components present', () => {
      const components = {
        visual: 80,
        behavioral: 90,
        audio: 70,
        contextual: 75,
      };

      const withoutPenalty = calculator.calculate(components);
      const withPenalty = calculator.calculateWithPenalty(components);

      expect(withPenalty).toBe(withoutPenalty);
    });
  });

  describe('calculateSmoothed', () => {
    it('should smooth score using previous score', () => {
      const currentScore = calculator.calculate({ visual: 50, behavioral: 50 });
      const smoothed = calculator.calculateSmoothed(
        { visual: 50, behavioral: 50 },
        90,
        0.3,
      );

      // Smoothed should be between current and previous
      expect(smoothed).toBeGreaterThan(currentScore);
      expect(smoothed).toBeLessThan(90);
    });

    it('should weight current score by smoothing factor', () => {
      // With factor 0.3: new = 0.3 * current + 0.7 * previous
      const smoothed = calculator.calculateSmoothed(
        { visual: 100, behavioral: 100 },
        0,
        0.3,
      );

      // Expected: 0.3 * 100 + 0.7 * 0 = 30
      expect(smoothed).toBe(30);
    });
  });

  describe('updateWeights', () => {
    it('should update weights and normalize', () => {
      calculator.updateWeights({ visual: 0.5 });
      const weights = calculator.getWeights();

      // Sum should still be 1.0
      const sum = weights.visual + weights.behavioral + weights.audio + weights.contextual;
      expect(sum).toBeCloseTo(1.0);
    });
  });

  describe('getContributionBreakdown', () => {
    it('should return individual component contributions', () => {
      const breakdown = calculator.getContributionBreakdown({
        visual: 80,
        behavioral: 90,
      });

      expect(breakdown.visual).toBeGreaterThan(0);
      expect(breakdown.behavioral).toBeGreaterThan(0);
      expect(breakdown.audio).toBe(0); // Not provided
      expect(breakdown.total).toBe(calculator.calculate({ visual: 80, behavioral: 90 }));
    });
  });

  describe('validateComponents', () => {
    it('should validate correct components', () => {
      const result = calculator.validateComponents({
        visual: 80,
        behavioral: 90,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject out of range values', () => {
      const result = calculator.validateComponents({
        visual: 150,
        behavioral: -10,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject NaN values', () => {
      const result = calculator.validateComponents({
        visual: NaN,
      });

      expect(result.valid).toBe(false);
    });
  });
});
