/**
 * Performance Monitor
 * Tracks and reports performance metrics
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  captureTime: number;
  processingTime: number;
  memoryUsage: number;
  totalFrames: number;
  droppedFrames: number;
}

export class PerformanceMonitor {
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private lastFrameTime: number = 0;
  private frameTimes: number[] = [];
  private captureTimes: number[] = [];
  private processingTimes: number[] = [];
  private maxSamples: number = 60; // Keep last 60 samples
  private isMonitoring: boolean = false;
  private monitoringInterval?: number;

  constructor() {
    // Start monitoring
    this.start();
  }

  /**
   * Start performance monitoring
   */
  public start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // Monitor every second
    this.monitoringInterval = window.setInterval(() => {
      this.checkPerformance();
    }, 1000);

    console.log('[PerformanceMonitor] Started');
  }

  /**
   * Stop performance monitoring
   */
  public stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.isMonitoring = false;
    console.log('[PerformanceMonitor] Stopped');
  }

  /**
   * Record frame capture
   */
  public recordFrame(captureTimeMs: number, processingTimeMs: number): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    this.frameCount++;
    this.frameTimes.push(frameTime);
    this.captureTimes.push(captureTimeMs);
    this.processingTimes.push(processingTimeMs);

    // Keep only recent samples
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
      this.captureTimes.shift();
      this.processingTimes.shift();
    }

    this.lastFrameTime = now;
  }

  /**
   * Record dropped frame
   */
  public recordDroppedFrame(): void {
    this.droppedFrames++;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    const avgFrameTime = this.average(this.frameTimes);
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    return {
      fps: Math.round(fps * 100) / 100,
      frameTime: Math.round(avgFrameTime * 100) / 100,
      captureTime: Math.round(this.average(this.captureTimes) * 100) / 100,
      processingTime: Math.round(this.average(this.processingTimes) * 100) / 100,
      memoryUsage: this.getMemoryUsage(),
      totalFrames: this.frameCount,
      droppedFrames: this.droppedFrames,
    };
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
    return 0;
  }

  /**
   * Calculate average
   */
  private average(arr: number[]): number {
    if (arr.length === 0) {
      return 0;
    }
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Check performance and log warnings
   */
  private checkPerformance(): void {
    const metrics = this.getMetrics();

    // Warn if FPS is too low
    if (metrics.fps < 0.8) {
      // Less than 0.8 FPS for 1 FPS target
      console.warn('[PerformanceMonitor] Low FPS detected:', metrics.fps);
    }

    // Warn if capture time is too high
    if (metrics.captureTime > 100) {
      // More than 100ms per capture
      console.warn('[PerformanceMonitor] High capture time:', metrics.captureTime, 'ms');
    }

    // Warn if memory usage is high
    if (metrics.memoryUsage > 80) {
      console.warn('[PerformanceMonitor] High memory usage:', metrics.memoryUsage, '%');
    }

    // Warn if too many dropped frames
    const dropRate = (metrics.droppedFrames / metrics.totalFrames) * 100;
    if (dropRate > 10) {
      console.warn('[PerformanceMonitor] High frame drop rate:', dropRate.toFixed(2), '%');
    }
  }

  /**
   * Reset metrics
   */
  public reset(): void {
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.frameTimes = [];
    this.captureTimes = [];
    this.processingTimes = [];
    this.lastFrameTime = performance.now();
    console.log('[PerformanceMonitor] Metrics reset');
  }

  /**
   * Get performance report
   */
  public getReport(): string {
    const metrics = this.getMetrics();
    const dropRate = ((metrics.droppedFrames / metrics.totalFrames) * 100).toFixed(2);

    return `
Performance Report:
------------------
FPS: ${metrics.fps}
Frame Time: ${metrics.frameTime}ms
Capture Time: ${metrics.captureTime}ms
Processing Time: ${metrics.processingTime}ms
Memory Usage: ${metrics.memoryUsage}%
Total Frames: ${metrics.totalFrames}
Dropped Frames: ${metrics.droppedFrames} (${dropRate}%)
    `.trim();
  }

  /**
   * Log current metrics
   */
  public logMetrics(): void {
    console.log(this.getReport());
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}