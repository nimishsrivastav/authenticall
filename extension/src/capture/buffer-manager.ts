/**
 * Buffer Manager
 * Manages temporary storage of captured data to prevent memory leaks
 */

export interface BufferItem {
  id: string;
  data: string;
  type: 'video' | 'audio' | 'transcript';
  timestamp: number;
  size: number;
}

export class BufferManager {
  private buffer: Map<string, BufferItem> = new Map();
  private maxBufferSize: number = 50 * 1024 * 1024; // 50MB max buffer
  private currentSize: number = 0;
  private cleanupInterval: number = 30000; // 30 seconds
  private cleanupTimer?: number;

  constructor(maxSize?: number) {
    if (maxSize) {
      this.maxBufferSize = maxSize;
    }

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Add item to buffer
   */
  public add(data: string, type: 'video' | 'audio' | 'transcript'): string {
    const id = this.generateId();
    const size = this.estimateSize(data);

    // Check if adding would exceed max size
    if (this.currentSize + size > this.maxBufferSize) {
      console.warn('[BufferManager] Buffer size limit reached, cleaning up...');
      this.cleanup();
    }

    const item: BufferItem = {
      id,
      data,
      type,
      timestamp: Date.now(),
      size,
    };

    this.buffer.set(id, item);
    this.currentSize += size;

    return id;
  }

  /**
   * Get item from buffer
   */
  public get(id: string): BufferItem | undefined {
    return this.buffer.get(id);
  }

  /**
   * Remove item from buffer
   */
  public remove(id: string): boolean {
    const item = this.buffer.get(id);
    
    if (item) {
      this.buffer.delete(id);
      this.currentSize -= item.size;
      return true;
    }

    return false;
  }

  /**
   * Get all items of a specific type
   */
  public getByType(type: 'video' | 'audio' | 'transcript'): BufferItem[] {
    return Array.from(this.buffer.values()).filter((item) => item.type === type);
  }

  /**
   * Clear all items
   */
  public clear(): void {
    this.buffer.clear();
    this.currentSize = 0;
    console.log('[BufferManager] Buffer cleared');
  }

  /**
   * Clean up old items
   */
  public cleanup(maxAge: number = 60000): void {
    const now = Date.now();
    let removedCount = 0;
    let removedSize = 0;

    for (const [id, item] of this.buffer.entries()) {
      if (now - item.timestamp > maxAge) {
        this.buffer.delete(id);
        this.currentSize -= item.size;
        removedCount++;
        removedSize += item.size;
      }
    }

    if (removedCount > 0) {
      console.log(
        `[BufferManager] Cleaned up ${removedCount} items (${this.formatSize(removedSize)})`,
      );
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop periodic cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: string): number {
    // Rough estimate: 1 character ≈ 1 byte for base64
    return data.length;
  }

  /**
   * Format size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  /**
   * Get buffer statistics
   */
  public getStats(): {
    itemCount: number;
    currentSize: number;
    maxSize: number;
    utilization: number;
    byType: {
      video: number;
      audio: number;
      transcript: number;
    };
  } {
    const byType = {
      video: 0,
      audio: 0,
      transcript: 0,
    };

    for (const item of this.buffer.values()) {
      byType[item.type]++;
    }

    return {
      itemCount: this.buffer.size,
      currentSize: this.currentSize,
      maxSize: this.maxBufferSize,
      utilization: (this.currentSize / this.maxBufferSize) * 100,
      byType,
    };
  }

  /**
   * Get buffer size
   */
  public getSize(): number {
    return this.buffer.size;
  }

  /**
   * Get current memory usage
   */
  public getCurrentSize(): number {
    return this.currentSize;
  }

  /**
   * Check if buffer is near capacity
   */
  public isNearCapacity(threshold: number = 0.8): boolean {
    return this.currentSize / this.maxBufferSize >= threshold;
  }
}