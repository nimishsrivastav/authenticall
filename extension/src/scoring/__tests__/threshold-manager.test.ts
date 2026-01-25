/**
 * Threshold Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThresholdManager } from '../threshold-manager';
import { DEFAULT_THRESHOLDS } from '../types';

describe('ThresholdManager', () => {
  let manager: ThresholdManager;

  beforeEach(() => {
    manager = new ThresholdManager();
  });

  describe('getRawLevel', () => {
    it('should return safe for scores >= 85', () => {
      expect(manager.getRawLevel(85)).toBe('safe');
      expect(manager.getRawLevel(100)).toBe('safe');
      expect(manager.getRawLevel(90)).toBe('safe');
    });

    it('should return caution for scores >= 50 and < 85', () => {
      expect(manager.getRawLevel(50)).toBe('caution');
      expect(manager.getRawLevel(84)).toBe('caution');
      expect(manager.getRawLevel(70)).toBe('caution');
    });

    it('should return danger for scores < 50', () => {
      expect(manager.getRawLevel(0)).toBe('danger');
      expect(manager.getRawLevel(49)).toBe('danger');
      expect(manager.getRawLevel(25)).toBe('danger');
    });
  });

  describe('determineLevel with hysteresis disabled', () => {
    beforeEach(() => {
      manager = new ThresholdManager(DEFAULT_THRESHOLDS, {
        enabled: false,
        buffer: 5,
        minSamplesBeforeChange: 3,
      });
    });

    it('should return raw level immediately', () => {
      expect(manager.determineLevel(90)).toBe('safe');
      expect(manager.determineLevel(70)).toBe('caution');
      expect(manager.determineLevel(30)).toBe('danger');
    });
  });

  describe('determineLevel with hysteresis enabled', () => {
    it('should return raw level on first call', () => {
      const level = manager.determineLevel(90);
      expect(level).toBe('safe');
    });

    it('should not change level immediately when in buffer zone', () => {
      // Start with safe level
      manager.determineLevel(90);

      // Drop to just below safe threshold (in buffer zone)
      const level = manager.determineLevel(82);

      // Should still be safe due to hysteresis
      expect(level).toBe('safe');
    });

    it('should change level after enough consecutive samples', () => {
      // Start with safe level
      manager.determineLevel(90);

      // Consistently report caution level
      manager.determineLevel(70);
      manager.determineLevel(70);
      const finalLevel = manager.determineLevel(70);

      // After 3 samples, should switch to caution
      expect(finalLevel).toBe('caution');
    });

    it('should change level immediately when far outside buffer', () => {
      // Start with safe level
      manager.determineLevel(90);

      // Drop to danger level (far outside buffer)
      const level = manager.determineLevel(30);

      // Should change immediately because outside buffer
      expect(level === 'danger' || level === 'caution').toBe(true);
    });
  });

  describe('updateThresholds', () => {
    it('should update thresholds', () => {
      manager.updateThresholds({ safe: 90 });

      const thresholds = manager.getThresholds();
      expect(thresholds.safe).toBe(90);
    });

    it('should validate threshold ordering', () => {
      // Try to set invalid thresholds
      manager.updateThresholds({ safe: 40, caution: 50 });

      const thresholds = manager.getThresholds();
      // Should enforce safe > caution
      expect(thresholds.safe).toBeGreaterThan(thresholds.caution);
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      manager.determineLevel(90);
      manager.determineLevel(70);

      manager.reset();

      expect(manager.getCurrentLevel()).toBe('unknown');
    });
  });

  describe('isLevelChangeImminent', () => {
    it('should detect when level change is about to happen', () => {
      // Start with safe level
      manager.determineLevel(90);

      // Two samples of caution level
      manager.determineLevel(70);
      manager.determineLevel(70);

      // Level change should be imminent (one more sample needed)
      const imminent = manager.isLevelChangeImminent();
      expect(imminent).toBe(true);
    });
  });

  describe('getDistanceToThreshold', () => {
    it('should return distance to next higher threshold', () => {
      const result = manager.getDistanceToThreshold(60, 'up');

      expect(result).not.toBeNull();
      expect(result!.threshold).toBe(85);
      expect(result!.distance).toBe(25);
      expect(result!.level).toBe('safe');
    });

    it('should return distance to next lower threshold', () => {
      const result = manager.getDistanceToThreshold(60, 'down');

      expect(result).not.toBeNull();
      expect(result!.threshold).toBe(50);
      expect(result!.distance).toBe(11); // 60 - 50 + 1
      expect(result!.level).toBe('danger');
    });

    it('should return null when at extreme', () => {
      const result = manager.getDistanceToThreshold(100, 'up');
      expect(result).toBeNull();
    });
  });
});
