/**
 * Cache Manager
 * Manages temporary caching with TTL-based expiration
 */

import {
  CacheEntry,
  CacheConfig,
  DEFAULT_CACHE_CONFIG,
} from './types';

export class CacheManager<T = unknown> {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry<T>> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Set a value in the cache
   */
  public set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.config.defaultTTL);

    // Check if cache is at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  public get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache entry metadata (without updating access stats)
   */
  public getMetadata(key: string): Omit<CacheEntry<T>, 'value'> | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    return {
      key: entry.key,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessedAt: entry.lastAccessedAt,
    };
  }

  /**
   * Extend TTL for a key
   */
  public extendTTL(key: string, additionalTime: number): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    entry.expiresAt += additionalTime;
    return true;
  }

  /**
   * Get or set with factory function
   */
  public async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Cleanup expired entries
   */
  public cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CacheManager] Cleaned up ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    // Find least recently accessed entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    avgAccessCount: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Array.from(this.cache.values());
    const totalAccessCount = entries.reduce((sum, e) => sum + e.accessCount, 0);

    const createdTimes = entries.map((e) => e.createdAt);
    const oldestEntry = createdTimes.length > 0 ? Math.min(...createdTimes) : null;
    const newestEntry = createdTimes.length > 0 ? Math.max(...createdTimes) : null;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: entries.length > 0 ? totalAccessCount / entries.length : 0,
      avgAccessCount:
        entries.length > 0 ? totalAccessCount / entries.length : 0,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Get all keys
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values (non-expired only)
   */
  public values(): T[] {
    const now = Date.now();
    const values: T[] = [];

    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        values.push(entry.value);
      }
    }

    return values;
  }

  /**
   * Get entries matching a prefix
   */
  public getByPrefix(prefix: string): Array<{ key: string; value: T }> {
    const now = Date.now();
    const results: Array<{ key: string; value: T }> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix) && now <= entry.expiresAt) {
        results.push({ key, value: entry.value });
      }
    }

    return results;
  }

  /**
   * Delete entries matching a prefix
   */
  public deleteByPrefix(prefix: string): number {
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    // Restart cleanup with new interval if changed
    if (newConfig.cleanupInterval) {
      this.stopCleanup();
      this.startCleanup();
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Get size
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Check if empty
   */
  public get isEmpty(): boolean {
    return this.cache.size === 0;
  }

  /**
   * Iterate over entries
   */
  public forEach(
    callback: (value: T, key: string, entry: CacheEntry<T>) => void,
  ): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now <= entry.expiresAt) {
        callback(entry.value, key, entry);
      }
    }
  }
}

// Create typed cache instances
export type AnalysisCacheManager = CacheManager<{
  score: number;
  confidence: number;
  timestamp: number;
}>;

/**
 * Create a new cache manager
 */
export function createCacheManager<T>(config?: Partial<CacheConfig>): CacheManager<T> {
  return new CacheManager<T>({
    ...DEFAULT_CACHE_CONFIG,
    ...config,
  });
}
