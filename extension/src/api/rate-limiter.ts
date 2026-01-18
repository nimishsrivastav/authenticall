/**
 * Rate Limiter
 * Implements token bucket algorithm for API rate limiting
 */

import { RATE_LIMITS } from '../shared/constants';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  maxConcurrentRequests: number;
}

export interface RateLimitStatus {
  availableTokens: number;
  queuedRequests: number;
  activeRequests: number;
  isLimited: boolean;
  resetTime: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private minuteTokens: number;
  private hourTokens: number;
  private activeRequests: number = 0;
  private lastMinuteReset: number;
  private lastHourReset: number;
  private queue: Array<() => void> = [];

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      requestsPerMinute: config?.requestsPerMinute ?? RATE_LIMITS.REQUESTS_PER_MINUTE,
      requestsPerHour: config?.requestsPerHour ?? RATE_LIMITS.REQUESTS_PER_HOUR,
      maxConcurrentRequests: config?.maxConcurrentRequests ?? RATE_LIMITS.CONCURRENT_REQUESTS,
    };

    this.minuteTokens = this.config.requestsPerMinute;
    this.hourTokens = this.config.requestsPerHour;
    this.lastMinuteReset = Date.now();
    this.lastHourReset = Date.now();

    // Start periodic token refresh
    this.startTokenRefresh();
  }

  /**
   * Acquire permission to make a request
   * Returns a promise that resolves when request is allowed
   */
  public async acquire(): Promise<void> {
    // Refresh tokens if needed
    this.refreshTokens();

    // Check if we can proceed immediately
    if (this.canProceed()) {
      this.consumeToken();
      return;
    }

    // Otherwise, queue the request
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.consumeToken();
        resolve();
      });
    });
  }

  /**
   * Release a request slot (call after request completes)
   */
  public release(): void {
    this.activeRequests--;

    // Process next queued request if available
    if (this.queue.length > 0 && this.canProceed()) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Check if request can proceed
   */
  private canProceed(): boolean {
    return (
      this.minuteTokens > 0 &&
      this.hourTokens > 0 &&
      this.activeRequests < this.config.maxConcurrentRequests
    );
  }

  /**
   * Consume a token
   */
  private consumeToken(): void {
    this.minuteTokens--;
    this.hourTokens--;
    this.activeRequests++;
  }

  /**
   * Refresh tokens based on time elapsed
   */
  private refreshTokens(): void {
    const now = Date.now();

    // Refresh minute tokens
    if (now - this.lastMinuteReset >= 60000) {
      this.minuteTokens = this.config.requestsPerMinute;
      this.lastMinuteReset = now;
    }

    // Refresh hour tokens
    if (now - this.lastHourReset >= 3600000) {
      this.hourTokens = this.config.requestsPerHour;
      this.lastHourReset = now;
    }
  }

  /**
   * Start periodic token refresh
   */
  private startTokenRefresh(): void {
    setInterval(() => {
      this.refreshTokens();

      // Process queued requests if tokens available
      while (this.queue.length > 0 && this.canProceed()) {
        const next = this.queue.shift();
        if (next) {
          next();
        }
      }
    }, 1000); // Check every second
  }

  /**
   * Get current rate limit status
   */
  public getStatus(): RateLimitStatus {
    this.refreshTokens();

    return {
      availableTokens: Math.min(this.minuteTokens, this.hourTokens),
      queuedRequests: this.queue.length,
      activeRequests: this.activeRequests,
      isLimited: !this.canProceed(),
      resetTime: Math.min(
        this.lastMinuteReset + 60000,
        this.lastHourReset + 3600000,
      ),
    };
  }

  /**
   * Wait for rate limit to clear
   */
  public async waitForAvailability(): Promise<void> {
    if (this.canProceed()) {
      return;
    }

    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.canProceed()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Clear all queued requests
   */
  public clearQueue(): void {
    this.queue = [];
  }

  /**
   * Reset rate limiter
   */
  public reset(): void {
    this.minuteTokens = this.config.requestsPerMinute;
    this.hourTokens = this.config.requestsPerHour;
    this.activeRequests = 0;
    this.lastMinuteReset = Date.now();
    this.lastHourReset = Date.now();
    this.clearQueue();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    this.reset();
  }
}

/**
 * Global rate limiter instance
 */
let globalRateLimiter: RateLimiter | null = null;

/**
 * Get or create global rate limiter
 */
export function getRateLimiter(): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter();
  }
  return globalRateLimiter;
}

/**
 * Wrapper to execute function with rate limiting
 */
export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const limiter = getRateLimiter();

  await limiter.acquire();

  try {
    return await fn();
  } finally {
    limiter.release();
  }
}