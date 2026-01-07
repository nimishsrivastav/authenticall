/**
 * Stream Manager
 * Coordinates video, audio, and transcript capture
 */

import { Platform } from '../shared/types';
import { VideoProcessor } from './video-processor';
import { AudioProcessor } from './audio-processor';
import { TranscriptExtractor } from './transcript-extractor';
import { BufferManager } from './buffer-manager';

export interface StreamManagerConfig {
  platform: Platform;
  videoFps: number;
  audioDuration: number;
  maxConcurrentRequests: number;
}

export class StreamManager {
  private config: StreamManagerConfig;
  private videoProcessor?: VideoProcessor;
  private audioProcessor?: AudioProcessor;
  private transcriptExtractor?: TranscriptExtractor;
  private bufferManager: BufferManager;
  private isRunning: boolean = false;
  private captureIntervals: number[] = [];

  constructor(config: StreamManagerConfig) {
    this.config = config;
    this.bufferManager = new BufferManager();
  }

  /**
   * Start stream capture
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[StreamManager] Already running');
      return;
    }

    console.log('[StreamManager] Starting capture...');

    try {
      // Initialize processors
      this.videoProcessor = new VideoProcessor(this.config.platform, this.bufferManager);
      this.audioProcessor = new AudioProcessor(this.config.platform, this.bufferManager);
      this.transcriptExtractor = new TranscriptExtractor(this.config.platform);

      // Start video capture
      await this.startVideoCapture();

      // Start audio capture
      await this.startAudioCapture();

      // Start transcript extraction
      this.startTranscriptExtraction();

      this.isRunning = true;
      console.log('[StreamManager] Capture started successfully');
    } catch (error) {
      console.error('[StreamManager] Failed to start capture:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop stream capture
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[StreamManager] Stopping capture...');

    // Clear all intervals
    this.captureIntervals.forEach((interval) => clearInterval(interval));
    this.captureIntervals = [];

    // Stop processors
    this.videoProcessor?.stop();
    this.audioProcessor?.stop();
    this.transcriptExtractor?.stop();

    // Clean up buffer
    this.bufferManager.clear();

    this.isRunning = false;
    console.log('[StreamManager] Capture stopped');
  }

  /**
   * Start video capture
   */
  private async startVideoCapture(): Promise<void> {
    if (!this.videoProcessor) {
      throw new Error('Video processor not initialized');
    }

    console.log('[StreamManager] Starting video capture...');

    // Initialize video processor
    await this.videoProcessor.initialize();

    // Calculate interval from FPS (default: 1 FPS = 1000ms)
    const intervalMs = 1000 / this.config.videoFps;

    // Capture frames at specified FPS
    const interval = window.setInterval(async () => {
      try {
        await this.videoProcessor?.captureFrame();
      } catch (error) {
        console.error('[StreamManager] Video capture error:', error);
      }
    }, intervalMs);

    this.captureIntervals.push(interval);
    console.log(`[StreamManager] Video capture started at ${this.config.videoFps} FPS`);
  }

  /**
   * Start audio capture
   */
  private async startAudioCapture(): Promise<void> {
    if (!this.audioProcessor) {
      throw new Error('Audio processor not initialized');
    }

    console.log('[StreamManager] Starting audio capture...');

    // Initialize audio processor
    await this.audioProcessor.initialize();

    // Capture audio chunks at specified duration
    const interval = window.setInterval(async () => {
      try {
        await this.audioProcessor?.captureChunk();
      } catch (error) {
        console.error('[StreamManager] Audio capture error:', error);
      }
    }, this.config.audioDuration);

    this.captureIntervals.push(interval);
    console.log(`[StreamManager] Audio capture started (${this.config.audioDuration}ms chunks)`);
  }

  /**
   * Start transcript extraction
   */
  private startTranscriptExtraction(): void {
    if (!this.transcriptExtractor) {
      throw new Error('Transcript extractor not initialized');
    }

    console.log('[StreamManager] Starting transcript extraction...');

    // Initialize transcript extractor
    this.transcriptExtractor.initialize();

    console.log('[StreamManager] Transcript extraction started');
  }

  /**
   * Get capture statistics
   */
  public getStatistics(): {
    isRunning: boolean;
    framesCaptured: number;
    audioChunksCaptured: number;
    transcriptsCaptured: number;
    bufferSize: number;
  } {
    return {
      isRunning: this.isRunning,
      framesCaptured: this.videoProcessor?.getFrameCount() ?? 0,
      audioChunksCaptured: this.audioProcessor?.getChunkCount() ?? 0,
      transcriptsCaptured: this.transcriptExtractor?.getTranscriptCount() ?? 0,
      bufferSize: this.bufferManager.getSize(),
    };
  }

  /**
   * Check if capture is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}