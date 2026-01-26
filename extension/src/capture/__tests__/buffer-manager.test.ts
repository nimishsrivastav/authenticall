/**
 * Buffer Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BufferManager } from '../buffer-manager';

describe('BufferManager', () => {
  let bufferManager: BufferManager;

  beforeEach(() => {
    vi.useFakeTimers();
    bufferManager = new BufferManager(1024 * 1024); // 1MB for testing
  });

  afterEach(() => {
    bufferManager.stopCleanup();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create buffer with default max size', () => {
      const defaultBuffer = new BufferManager();
      const stats = defaultBuffer.getStats();
      expect(stats.maxSize).toBe(50 * 1024 * 1024); // 50MB default
      defaultBuffer.stopCleanup();
    });

    it('should create buffer with custom max size', () => {
      const stats = bufferManager.getStats();
      expect(stats.maxSize).toBe(1024 * 1024);
    });
  });

  describe('add', () => {
    it('should add item to buffer and return id', () => {
      const id = bufferManager.add('test-data', 'video');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should store item with correct properties', () => {
      const id = bufferManager.add('test-data', 'video');
      const item = bufferManager.get(id);

      expect(item).toBeDefined();
      expect(item?.data).toBe('test-data');
      expect(item?.type).toBe('video');
      expect(item?.timestamp).toBeLessThanOrEqual(Date.now());
      expect(item?.size).toBe('test-data'.length);
    });

    it('should increment current size', () => {
      const initialSize = bufferManager.getCurrentSize();
      bufferManager.add('test-data', 'video');
      expect(bufferManager.getCurrentSize()).toBe(initialSize + 'test-data'.length);
    });

    it('should trigger cleanup when buffer is near capacity', () => {
      // Fill buffer near capacity
      const largeData = 'x'.repeat(1024 * 900); // 900KB
      bufferManager.add(largeData, 'video');

      // Adding more should trigger cleanup
      const cleanupSpy = vi.spyOn(bufferManager, 'cleanup');
      bufferManager.add('y'.repeat(1024 * 200), 'video'); // 200KB more

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return item by id', () => {
      const id = bufferManager.add('test-data', 'audio');
      const item = bufferManager.get(id);

      expect(item).toBeDefined();
      expect(item?.id).toBe(id);
    });

    it('should return undefined for non-existent id', () => {
      const item = bufferManager.get('non-existent-id');
      expect(item).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove item from buffer', () => {
      const id = bufferManager.add('test-data', 'video');
      expect(bufferManager.get(id)).toBeDefined();

      const removed = bufferManager.remove(id);
      expect(removed).toBe(true);
      expect(bufferManager.get(id)).toBeUndefined();
    });

    it('should decrease current size on removal', () => {
      const id = bufferManager.add('test-data', 'video');
      const sizeAfterAdd = bufferManager.getCurrentSize();

      bufferManager.remove(id);
      expect(bufferManager.getCurrentSize()).toBe(sizeAfterAdd - 'test-data'.length);
    });

    it('should return false when removing non-existent item', () => {
      const removed = bufferManager.remove('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('getByType', () => {
    it('should return all items of specified type', () => {
      bufferManager.add('video-1', 'video');
      bufferManager.add('video-2', 'video');
      bufferManager.add('audio-1', 'audio');
      bufferManager.add('transcript-1', 'transcript');

      const videos = bufferManager.getByType('video');
      expect(videos).toHaveLength(2);
      expect(videos.every((item) => item.type === 'video')).toBe(true);
    });

    it('should return empty array when no items of type exist', () => {
      bufferManager.add('video-1', 'video');
      const transcripts = bufferManager.getByType('transcript');
      expect(transcripts).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all items from buffer', () => {
      bufferManager.add('data-1', 'video');
      bufferManager.add('data-2', 'audio');
      bufferManager.add('data-3', 'transcript');

      bufferManager.clear();

      expect(bufferManager.getSize()).toBe(0);
      expect(bufferManager.getCurrentSize()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove items older than maxAge', () => {
      const id1 = bufferManager.add('old-data', 'video');

      // Advance time by 70 seconds
      vi.advanceTimersByTime(70000);

      const id2 = bufferManager.add('new-data', 'video');

      bufferManager.cleanup(60000); // 60 second max age

      expect(bufferManager.get(id1)).toBeUndefined();
      expect(bufferManager.get(id2)).toBeDefined();
    });

    it('should update current size after cleanup', () => {
      bufferManager.add('old-data-1', 'video');
      bufferManager.add('old-data-2', 'video');

      vi.advanceTimersByTime(70000);

      bufferManager.add('new-data', 'video');
      const sizeBeforeCleanup = bufferManager.getCurrentSize();

      bufferManager.cleanup(60000);

      expect(bufferManager.getCurrentSize()).toBeLessThan(sizeBeforeCleanup);
    });

    it('should not remove items within maxAge', () => {
      const id = bufferManager.add('recent-data', 'video');

      vi.advanceTimersByTime(30000); // 30 seconds

      bufferManager.cleanup(60000); // 60 second max age

      expect(bufferManager.get(id)).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      bufferManager.add('video-data', 'video');
      bufferManager.add('audio-data', 'audio');
      bufferManager.add('transcript-data', 'transcript');

      const stats = bufferManager.getStats();

      expect(stats.itemCount).toBe(3);
      expect(stats.currentSize).toBeGreaterThan(0);
      expect(stats.maxSize).toBe(1024 * 1024);
      expect(stats.utilization).toBeGreaterThan(0);
      expect(stats.byType.video).toBe(1);
      expect(stats.byType.audio).toBe(1);
      expect(stats.byType.transcript).toBe(1);
    });

    it('should calculate utilization correctly', () => {
      const data = 'x'.repeat(1024 * 100); // 100KB
      bufferManager.add(data, 'video');

      const stats = bufferManager.getStats();
      // 100KB / 1MB = 10% (approximately)
      expect(stats.utilization).toBeCloseTo(9.765625, 1);
    });
  });

  describe('getSize', () => {
    it('should return correct item count', () => {
      expect(bufferManager.getSize()).toBe(0);

      bufferManager.add('data-1', 'video');
      expect(bufferManager.getSize()).toBe(1);

      bufferManager.add('data-2', 'audio');
      expect(bufferManager.getSize()).toBe(2);
    });
  });

  describe('getCurrentSize', () => {
    it('should return correct byte size', () => {
      expect(bufferManager.getCurrentSize()).toBe(0);

      bufferManager.add('12345', 'video'); // 5 bytes
      expect(bufferManager.getCurrentSize()).toBe(5);

      bufferManager.add('67890', 'audio'); // 5 more bytes
      expect(bufferManager.getCurrentSize()).toBe(10);
    });
  });

  describe('isNearCapacity', () => {
    it('should return true when buffer is at or above threshold', () => {
      const data = 'x'.repeat(1024 * 850); // 850KB, ~83% of 1MB
      bufferManager.add(data, 'video');

      expect(bufferManager.isNearCapacity(0.8)).toBe(true);
    });

    it('should return false when buffer is below threshold', () => {
      const data = 'x'.repeat(1024 * 100); // 100KB, ~10% of 1MB
      bufferManager.add(data, 'video');

      expect(bufferManager.isNearCapacity(0.8)).toBe(false);
    });

    it('should use default threshold of 0.8', () => {
      const data = 'x'.repeat(1024 * 850);
      bufferManager.add(data, 'video');

      expect(bufferManager.isNearCapacity()).toBe(true);
    });
  });

  describe('periodic cleanup', () => {
    it('should automatically clean up on interval', () => {
      const cleanupSpy = vi.spyOn(bufferManager, 'cleanup');

      // Add some data
      bufferManager.add('old-data', 'video');

      // Advance time past cleanup interval (30 seconds)
      vi.advanceTimersByTime(31000);

      // Cleanup should have been called
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('stopCleanup', () => {
    it('should stop periodic cleanup', () => {
      const cleanupSpy = vi.spyOn(bufferManager, 'cleanup');

      bufferManager.stopCleanup();

      // Advance time past multiple cleanup intervals
      vi.advanceTimersByTime(120000);

      // Cleanup should not have been called after stopping
      expect(cleanupSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const id = bufferManager.add('', 'video');
      const item = bufferManager.get(id);

      expect(item).toBeDefined();
      expect(item?.data).toBe('');
      expect(item?.size).toBe(0);
    });

    it('should handle very large data', () => {
      const largeData = 'x'.repeat(1024 * 500); // 500KB
      const id = bufferManager.add(largeData, 'video');
      const item = bufferManager.get(id);

      expect(item).toBeDefined();
      expect(item?.size).toBe(1024 * 500);
    });

    it('should generate unique ids', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        ids.add(bufferManager.add(`data-${i}`, 'video'));
      }

      expect(ids.size).toBe(100);
    });
  });
});
