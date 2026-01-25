/**
 * Anomaly Detector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnomalyDetector } from '../anomaly-detector';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('detect sudden drop', () => {
    it('should detect sudden score drop', () => {
      // Add initial scores
      detector.detect(90);

      // Sudden drop
      const result = detector.detect(40);

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('sudden_drop');
      expect(result.deviation).toBe(50);
    });

    it('should not flag gradual decline as anomaly', () => {
      detector.detect(90);
      detector.detect(85);
      detector.detect(80);
      const result = detector.detect(75);

      expect(result.isAnomaly).toBe(false);
    });

    it('should classify severity based on drop magnitude', () => {
      detector.detect(100);
      const criticalDrop = detector.detect(30); // 70 point drop

      expect(criticalDrop.severity).toBe('critical');
    });
  });

  describe('detect sudden spike', () => {
    it('should detect sudden score spike', () => {
      detector.detect(40);
      const result = detector.detect(80); // 40 point increase

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('sudden_spike');
    });
  });

  describe('detect volatility', () => {
    it('should detect high score volatility', () => {
      // Add volatile scores
      const scores = [80, 40, 90, 30, 85, 35, 88, 32, 87, 38];
      let result;

      for (const score of scores) {
        result = detector.detect(score);
      }

      // Should detect volatility
      expect(result?.isAnomaly).toBe(true);
      expect(result?.type).toBe('volatility');
    });

    it('should not flag stable scores as volatile', () => {
      // Add stable scores
      const scores = [80, 82, 79, 81, 80, 83, 78, 82, 80, 81];
      let result;

      for (const score of scores) {
        result = detector.detect(score);
      }

      // Should not detect volatility
      if (result?.type === 'volatility') {
        expect(result.isAnomaly).toBe(false);
      }
    });
  });

  describe('detect sustained low', () => {
    it('should detect sustained low score over time', () => {
      // Simulate time passing with low scores
      detector.updateConfig({ sustainedLowDuration: 100 }); // 100ms for testing

      detector.detect(30);

      // Wait and check again
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = detector.detect(30);
          expect(result.isAnomaly).toBe(true);
          expect(result.type).toBe('sustained_low');
          resolve();
        }, 150);
      });
    });
  });

  describe('detect baseline deviation', () => {
    it('should detect deviation from baseline', () => {
      const baseline = {
        sessionId: 'test',
        establishedAt: Date.now(),
        samples: 10,
        averageScore: 85,
        standardDeviation: 5,
        componentAverages: {
          visual: 85,
          behavioral: 85,
          audio: 85,
          contextual: 85,
        },
        isEstablished: true,
        minEstablishmentSamples: 10,
        establishmentDuration: 120000,
      };

      // Score deviating significantly from baseline
      const result = detector.detect(50, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('baseline_deviation');
    });

    it('should not flag scores close to baseline', () => {
      const baseline = {
        sessionId: 'test',
        establishedAt: Date.now(),
        samples: 10,
        averageScore: 85,
        standardDeviation: 5,
        componentAverages: {
          visual: 85,
          behavioral: 85,
          audio: 85,
          contextual: 85,
        },
        isEstablished: true,
        minEstablishmentSamples: 10,
        establishmentDuration: 120000,
      };

      const result = detector.detect(82, baseline);

      // Should not be baseline_deviation anomaly
      if (result.type === 'baseline_deviation') {
        expect(result.isAnomaly).toBe(false);
      }
    });
  });

  describe('configuration', () => {
    it('should respect enabled flag', () => {
      detector.setEnabled(false);
      detector.detect(90);
      const result = detector.detect(30);

      expect(result.isAnomaly).toBe(false);
    });

    it('should allow config updates', () => {
      detector.updateConfig({ suddenDropThreshold: 60 });

      detector.detect(90);
      const result = detector.detect(40); // 50 point drop

      // With threshold of 60, 50 point drop should not trigger
      expect(result.type !== 'sudden_drop' || !result.isAnomaly).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      detector.detect(80);
      detector.detect(70);
      detector.detect(90);
      detector.detect(60);

      const stats = detector.getStatistics();

      expect(stats.count).toBe(4);
      expect(stats.average).toBe(75);
      expect(stats.min).toBe(60);
      expect(stats.max).toBe(90);
    });
  });

  describe('clearHistory', () => {
    it('should clear history', () => {
      detector.detect(80);
      detector.detect(70);

      detector.clearHistory();

      const stats = detector.getStatistics();
      expect(stats.count).toBe(0);
    });
  });
});
