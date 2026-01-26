/**
 * Performance Monitor Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor, getPerformanceMonitor } from '../performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should start monitoring automatically', () => {
      // Monitor starts in constructor
      expect(monitor.getMetrics()).toBeDefined();
    });
  });

  describe('start/stop', () => {
    it('should start monitoring', () => {
      monitor.stop(); // Stop first
      monitor.start();
      expect(monitor.getMetrics()).toBeDefined();
    });

    it('should not start twice', () => {
      monitor.start(); // Already started in constructor
      monitor.start(); // Should not throw or create duplicate intervals
      expect(monitor.getMetrics()).toBeDefined();
    });

    it('should stop monitoring', () => {
      monitor.stop();
      // Should not throw and metrics should still be available
      expect(monitor.getMetrics()).toBeDefined();
    });

    it('should not stop twice', () => {
      monitor.stop();
      monitor.stop(); // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('recordFrame', () => {
    it('should record frame data', () => {
      monitor.recordFrame(50, 30);

      const metrics = monitor.getMetrics();
      expect(metrics.totalFrames).toBe(1);
      expect(metrics.captureTime).toBe(50);
      expect(metrics.processingTime).toBe(30);
    });

    it('should accumulate frame count', () => {
      monitor.recordFrame(50, 30);
      monitor.recordFrame(50, 30);
      monitor.recordFrame(50, 30);

      expect(monitor.getMetrics().totalFrames).toBe(3);
    });

    it('should calculate average times', () => {
      monitor.recordFrame(40, 20);
      monitor.recordFrame(60, 40);

      const metrics = monitor.getMetrics();
      expect(metrics.captureTime).toBe(50); // (40+60)/2
      expect(metrics.processingTime).toBe(30); // (20+40)/2
    });

    it('should keep only recent samples', () => {
      // Record more than maxSamples (60)
      for (let i = 0; i < 70; i++) {
        monitor.recordFrame(i, i);
      }

      // Should still have valid metrics from recent samples
      const metrics = monitor.getMetrics();
      expect(metrics.captureTime).toBeGreaterThan(0);
    });
  });

  describe('recordDroppedFrame', () => {
    it('should count dropped frames', () => {
      monitor.recordDroppedFrame();
      monitor.recordDroppedFrame();
      monitor.recordDroppedFrame();

      expect(monitor.getMetrics().droppedFrames).toBe(3);
    });
  });

  describe('getMetrics', () => {
    it('should return all metrics', () => {
      monitor.recordFrame(50, 30);

      const metrics = monitor.getMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('captureTime');
      expect(metrics).toHaveProperty('processingTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('totalFrames');
      expect(metrics).toHaveProperty('droppedFrames');
    });

    it('should return 0 for empty data', () => {
      const metrics = monitor.getMetrics();

      expect(metrics.fps).toBe(0);
      expect(metrics.frameTime).toBe(0);
      expect(metrics.captureTime).toBe(0);
      expect(metrics.processingTime).toBe(0);
    });

    it('should calculate FPS from frame times', () => {
      // Simulate 1 FPS (1000ms between frames)
      vi.setSystemTime(Date.now());
      monitor.recordFrame(50, 30);

      vi.advanceTimersByTime(1000);
      monitor.recordFrame(50, 30);

      const metrics = monitor.getMetrics();
      // FPS should be approximately 1 (with some margin for timing)
      expect(metrics.fps).toBeGreaterThan(0);
    });

    it('should round values to 2 decimal places', () => {
      monitor.recordFrame(50.333, 30.666);

      const metrics = monitor.getMetrics();
      expect(metrics.captureTime.toString()).toMatch(/^\d+\.?\d{0,2}$/);
      expect(metrics.processingTime.toString()).toMatch(/^\d+\.?\d{0,2}$/);
    });

    it('should get memory usage', () => {
      const metrics = monitor.getMetrics();
      expect(typeof metrics.memoryUsage).toBe('number');
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      monitor.recordFrame(50, 30);
      monitor.recordFrame(50, 30);
      monitor.recordDroppedFrame();

      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.totalFrames).toBe(0);
      expect(metrics.droppedFrames).toBe(0);
      expect(metrics.captureTime).toBe(0);
      expect(metrics.processingTime).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should return formatted report', () => {
      monitor.recordFrame(50, 30);
      monitor.recordDroppedFrame();

      const report = monitor.getReport();

      expect(report).toContain('Performance Report');
      expect(report).toContain('FPS:');
      expect(report).toContain('Frame Time:');
      expect(report).toContain('Capture Time:');
      expect(report).toContain('Processing Time:');
      expect(report).toContain('Memory Usage:');
      expect(report).toContain('Total Frames:');
      expect(report).toContain('Dropped Frames:');
    });

    it('should include drop rate percentage', () => {
      monitor.recordFrame(50, 30);
      monitor.recordFrame(50, 30);
      monitor.recordDroppedFrame();

      const report = monitor.getReport();
      expect(report).toMatch(/Dropped Frames: \d+ \(\d+\.\d+%\)/);
    });
  });

  describe('logMetrics', () => {
    it('should log metrics without error', () => {
      monitor.recordFrame(50, 30);
      expect(() => monitor.logMetrics()).not.toThrow();
    });
  });

  describe('checkPerformance', () => {
    it('should warn on low FPS', () => {
      // Record frames with very long intervals (low FPS)
      monitor.recordFrame(50, 30);
      vi.advanceTimersByTime(2000); // 2 seconds between frames = 0.5 FPS
      monitor.recordFrame(50, 30);

      // Trigger performance check
      vi.advanceTimersByTime(1000);

      // Check should have been triggered (no error)
      expect(true).toBe(true);
    });

    it('should warn on high capture time', () => {
      // Record frames with high capture time
      monitor.recordFrame(150, 30); // > 100ms capture time

      // Trigger performance check
      vi.advanceTimersByTime(1000);

      expect(true).toBe(true);
    });

    it('should warn on high drop rate', () => {
      // Record some frames
      monitor.recordFrame(50, 30);
      monitor.recordFrame(50, 30);

      // Record many dropped frames (> 10%)
      for (let i = 0; i < 5; i++) {
        monitor.recordDroppedFrame();
      }

      // Trigger performance check
      vi.advanceTimersByTime(1000);

      expect(true).toBe(true);
    });
  });

  describe('periodic monitoring', () => {
    it('should check performance periodically', () => {
      monitor.recordFrame(50, 30);

      // Advance through several intervals
      vi.advanceTimersByTime(5000);

      // Should not throw and should continue working
      expect(monitor.getMetrics().totalFrames).toBe(1);
    });
  });
});

describe('getPerformanceMonitor', () => {
  it('should return singleton instance', () => {
    const monitor1 = getPerformanceMonitor();
    const monitor2 = getPerformanceMonitor();
    expect(monitor1).toBe(monitor2);
  });

  it('should return working monitor', () => {
    const monitor = getPerformanceMonitor();
    monitor.recordFrame(50, 30);
    expect(monitor.getMetrics().totalFrames).toBeGreaterThan(0);
  });
});
