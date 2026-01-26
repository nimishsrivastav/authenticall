/**
 * Rate Limiter Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, getRateLimiter, withRateLimit } from '../rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter({
      requestsPerMinute: 10,
      requestsPerHour: 100,
      maxConcurrentRequests: 3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create limiter with custom config', () => {
      const status = limiter.getStatus();
      expect(status.availableTokens).toBe(10);
    });

    it('should create limiter with default config', () => {
      const defaultLimiter = new RateLimiter();
      const status = defaultLimiter.getStatus();
      expect(status.availableTokens).toBe(60); // Default REQUESTS_PER_MINUTE
    });
  });

  describe('acquire', () => {
    it('should allow request when tokens available', async () => {
      const acquirePromise = limiter.acquire();
      await expect(acquirePromise).resolves.toBeUndefined();
    });

    it('should consume tokens on acquire', async () => {
      const statusBefore = limiter.getStatus();
      await limiter.acquire();
      limiter.release();
      const statusAfter = limiter.getStatus();

      expect(statusAfter.availableTokens).toBe(statusBefore.availableTokens - 1);
    });

    it('should increment active requests', async () => {
      await limiter.acquire();
      const status = limiter.getStatus();
      expect(status.activeRequests).toBe(1);
    });

    it('should queue request when at capacity', async () => {
      // Max out concurrent requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      // This should be queued
      const queuedPromise = limiter.acquire();
      const status = limiter.getStatus();

      expect(status.queuedRequests).toBe(1);

      // Release one to allow queued request
      limiter.release();
      await queuedPromise;
    });

    it('should wait when tokens exhausted', async () => {
      // Exhaust minute tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
        limiter.release();
      }

      // Next acquire should be queued
      const status = limiter.getStatus();
      expect(status.availableTokens).toBe(0);
      expect(status.isLimited).toBe(true);
    });
  });

  describe('release', () => {
    it('should decrement active requests', async () => {
      await limiter.acquire();
      expect(limiter.getStatus().activeRequests).toBe(1);

      limiter.release();
      expect(limiter.getStatus().activeRequests).toBe(0);
    });

    it('should process queued requests on release', async () => {
      // Max out concurrent requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      let queuedResolved = false;
      const queuedPromise = limiter.acquire().then(() => {
        queuedResolved = true;
      });

      expect(queuedResolved).toBe(false);

      // Release one
      limiter.release();
      await queuedPromise;

      expect(queuedResolved).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return correct status', async () => {
      await limiter.acquire();
      await limiter.acquire();

      const status = limiter.getStatus();

      expect(status.activeRequests).toBe(2);
      expect(status.availableTokens).toBe(8);
      expect(status.queuedRequests).toBe(0);
      expect(status.isLimited).toBe(false);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    it('should show limited status when no tokens', async () => {
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
        limiter.release();
      }

      const status = limiter.getStatus();
      expect(status.isLimited).toBe(true);
    });
  });

  describe('token refresh', () => {
    it('should refresh minute tokens after 60 seconds', async () => {
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
        limiter.release();
      }

      expect(limiter.getStatus().availableTokens).toBe(0);

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61000);

      expect(limiter.getStatus().availableTokens).toBe(10);
    });

    it('should refresh hour tokens after 3600 seconds', async () => {
      const limiterLowHour = new RateLimiter({
        requestsPerMinute: 100,
        requestsPerHour: 5,
        maxConcurrentRequests: 10,
      });

      // Exhaust hour tokens (minute tokens are higher)
      for (let i = 0; i < 5; i++) {
        await limiterLowHour.acquire();
        limiterLowHour.release();
      }

      // After minute refresh, should still be limited by hour tokens
      vi.advanceTimersByTime(61000);
      expect(limiterLowHour.getStatus().availableTokens).toBe(0);

      // After hour refresh, should have tokens again
      vi.advanceTimersByTime(3600000);
      expect(limiterLowHour.getStatus().availableTokens).toBe(5);
    });
  });

  describe('waitForAvailability', () => {
    it('should resolve immediately when available', async () => {
      await limiter.waitForAvailability();
      // If we get here, it resolved
      expect(true).toBe(true);
    });

    it('should wait when limited', async () => {
      // Exhaust tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
        limiter.release();
      }

      let resolved = false;
      const waitPromise = limiter.waitForAvailability().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      // Advance time to refresh tokens
      vi.advanceTimersByTime(61000);

      await waitPromise;
      expect(resolved).toBe(true);
    });
  });

  describe('clearQueue', () => {
    it('should clear all queued requests', async () => {
      // Max out concurrent requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      // Queue some requests
      limiter.acquire();
      limiter.acquire();

      expect(limiter.getStatus().queuedRequests).toBe(2);

      limiter.clearQueue();

      expect(limiter.getStatus().queuedRequests).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      // Use some tokens
      await limiter.acquire();
      await limiter.acquire();

      // Queue some requests
      limiter.acquire();

      limiter.reset();

      const status = limiter.getStatus();
      expect(status.availableTokens).toBe(10);
      expect(status.activeRequests).toBe(0);
      expect(status.queuedRequests).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration and reset', async () => {
      await limiter.acquire();
      limiter.release();

      limiter.updateConfig({
        requestsPerMinute: 20,
      });

      const status = limiter.getStatus();
      expect(status.availableTokens).toBe(20);
    });
  });

  describe('concurrent request limit', () => {
    it('should limit concurrent requests', async () => {
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      // 4th request should be queued
      const status = limiter.getStatus();
      expect(status.activeRequests).toBe(3);

      let fourthAcquired = false;
      const fourthPromise = limiter.acquire().then(() => {
        fourthAcquired = true;
      });

      // Should not be acquired yet
      expect(fourthAcquired).toBe(false);

      // Release one
      limiter.release();
      await fourthPromise;

      expect(fourthAcquired).toBe(true);
    });
  });
});

describe('getRateLimiter', () => {
  it('should return singleton instance', () => {
    const limiter1 = getRateLimiter();
    const limiter2 = getRateLimiter();
    expect(limiter1).toBe(limiter2);
  });
});

describe('withRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute function with rate limiting', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');

    const result = await withRateLimit(mockFn);

    expect(mockFn).toHaveBeenCalled();
    expect(result).toBe('result');
  });

  it('should release on success', async () => {
    const limiter = getRateLimiter();
    const initialActive = limiter.getStatus().activeRequests;

    await withRateLimit(async () => 'result');

    expect(limiter.getStatus().activeRequests).toBe(initialActive);
  });

  it('should release on error', async () => {
    const limiter = getRateLimiter();
    const initialActive = limiter.getStatus().activeRequests;

    const errorFn = async () => {
      throw new Error('Test error');
    };

    await expect(withRateLimit(errorFn)).rejects.toThrow('Test error');
    expect(limiter.getStatus().activeRequests).toBe(initialActive);
  });
});
