/**
 * Cache Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, createCacheManager } from '../cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = createCacheManager<string>({
      defaultTTL: 1000, // 1 second for testing
      maxSize: 10,
      cleanupInterval: 60000,
    });
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should return null for expired entries', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', async () => {
      cache.set('key1', 'value1', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete entries', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.size).toBe(0);
    });
  });

  describe('max size', () => {
    it('should evict oldest entry when at capacity', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size).toBe(10);

      // Add one more
      cache.set('key10', 'value10');

      // Should still be at max size
      expect(cache.size).toBe(10);

      // First key should be evicted
      expect(cache.has('key0')).toBe(false);
    });
  });

  describe('extendTTL', () => {
    it('should extend TTL for existing entry', async () => {
      cache.set('key1', 'value1', 100);

      // Extend by 1 second
      expect(cache.extendTTL('key1', 1000)).toBe(true);

      // Wait past original TTL
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should still exist due to extended TTL
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.extendTTL('nonexistent', 1000)).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cache.set('key1', 'cached');

      const result = await cache.getOrSet('key1', () => 'new');

      expect(result).toBe('cached');
    });

    it('should call factory and cache result if not exists', async () => {
      const factory = vi.fn(() => 'new');

      const result = await cache.getOrSet('key1', factory);

      expect(result).toBe('new');
      expect(factory).toHaveBeenCalled();
      expect(cache.get('key1')).toBe('new');
    });

    it('should work with async factories', async () => {
      const result = await cache.getOrSet(
        'key1',
        () => Promise.resolve('async'),
      );

      expect(result).toBe('async');
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 1000);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });
  });

  describe('getByPrefix', () => {
    it('should return entries matching prefix', () => {
      cache.set('user:1', 'Alice');
      cache.set('user:2', 'Bob');
      cache.set('session:1', 'data');

      const users = cache.getByPrefix('user:');

      expect(users.length).toBe(2);
      expect(users.some((u) => u.value === 'Alice')).toBe(true);
    });
  });

  describe('deleteByPrefix', () => {
    it('should delete entries matching prefix', () => {
      cache.set('user:1', 'Alice');
      cache.set('user:2', 'Bob');
      cache.set('session:1', 'data');

      const deleted = cache.deleteByPrefix('user:');

      expect(deleted).toBe(2);
      expect(cache.has('user:1')).toBe(false);
      expect(cache.has('session:1')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(10);
    });
  });

  describe('getMetadata', () => {
    it('should return entry metadata without value', () => {
      cache.set('key1', 'value1');

      const metadata = cache.getMetadata('key1');

      expect(metadata).not.toBeNull();
      expect(metadata!.key).toBe('key1');
      expect(metadata!.createdAt).toBeGreaterThan(0);
      expect(metadata!.expiresAt).toBeGreaterThan(metadata!.createdAt);
      expect((metadata as any).value).toBeUndefined();
    });
  });
});
