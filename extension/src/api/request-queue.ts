/**
 * Request Queue
 * Manages queuing and prioritization of API requests
 */

export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

export interface QueuedRequest<T> {
  id: string;
  priority: RequestPriority;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
}

export class RequestQueue {
  private queue: Array<QueuedRequest<unknown>> = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number;
  private stats: {
    completed: number;
    failed: number;
    totalProcessingTime: number;
  } = {
    completed: 0,
    failed: 0,
    totalProcessingTime: 0,
  };

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add request to queue
   */
  public async enqueue<T>(
    execute: () => Promise<T>,
    priority: RequestPriority = 'normal',
    maxRetries: number = 3,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: this.generateId(),
        priority,
        execute,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (error: Error) => void,
        timestamp: Date.now(),
        retries: 0,
        maxRetries,
      };

      // Insert into queue based on priority
      this.insertByPriority(request);

      // Try to process
      this.processNext();
    });
  }

  /**
   * Insert request into queue based on priority
   */
  private insertByPriority<T>(request: QueuedRequest<T>): void {
    const priorityValues: Record<RequestPriority, number> = {
      critical: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    const requestPriority = priorityValues[request.priority];

    // Find insertion point
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queueItemPriority = priorityValues[this.queue[i]?.priority ?? 'normal'];
      if (requestPriority > queueItemPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, request as QueuedRequest<unknown>);
  }

  /**
   * Process next request in queue
   */
  private async processNext(): Promise<void> {
    // Check if we can process more requests
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Get next request
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    // Mark as processing
    this.processing.add(request.id);

    // Execute request
    const startTime = Date.now();
    try {
      const result = await request.execute();
      const processingTime = Date.now() - startTime;

      // Update stats
      this.stats.completed++;
      this.stats.totalProcessingTime += processingTime;

      // Resolve promise
      request.resolve(result);
    } catch (error) {
      // Handle retry
      if (request.retries < request.maxRetries) {
        request.retries++;
        console.log(
          `[RequestQueue] Retrying request ${request.id} (attempt ${request.retries}/${request.maxRetries})`,
        );

        // Re-queue with exponential backoff
        const backoffDelay = Math.min(
          1000 * Math.pow(2, request.retries),
          30000, // Max 30 seconds
        );

        setTimeout(() => {
          this.insertByPriority(request);
          this.processNext();
        }, backoffDelay);
      } else {
        // Max retries reached, fail
        this.stats.failed++;
        request.reject(
          error instanceof Error ? error : new Error('Request failed'),
        );
      }
    } finally {
      // Remove from processing
      this.processing.delete(request.id);

      // Process next
      this.processNext();
    }
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
      totalProcessingTime: this.stats.totalProcessingTime,
      averageProcessingTime:
        this.stats.completed > 0
          ? this.stats.totalProcessingTime / this.stats.completed
          : 0,
    };
  }

  /**
   * Clear queue
   */
  public clear(): void {
    // Reject all pending requests
    this.queue.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });

    this.queue = [];
  }

  /**
   * Pause queue processing
   */
  public pause(): void {
    // Implementation would prevent processNext from executing
    // For now, just clear the queue
    console.warn('[RequestQueue] Pause not fully implemented, clearing queue');
    this.clear();
  }

  /**
   * Get queue size
   */
  public size(): number {
    return this.queue.length + this.processing.size;
  }

  /**
   * Check if queue is empty
   */
  public isEmpty(): boolean {
    return this.queue.length === 0 && this.processing.size === 0;
  }

  /**
   * Wait for all requests to complete
   */
  public async waitForEmpty(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isEmpty()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Update max concurrent requests
   */
  public updateMaxConcurrent(maxConcurrent: number): void {
    this.maxConcurrent = maxConcurrent;

    // Try to process more requests if limit increased
    for (let i = this.processing.size; i < this.maxConcurrent; i++) {
      this.processNext();
    }
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      completed: 0,
      failed: 0,
      totalProcessingTime: 0,
    };
  }
}

/**
 * Global request queue instance
 */
let globalRequestQueue: RequestQueue | null = null;

/**
 * Get or create global request queue
 */
export function getRequestQueue(): RequestQueue {
  if (!globalRequestQueue) {
    globalRequestQueue = new RequestQueue();
  }
  return globalRequestQueue;
}