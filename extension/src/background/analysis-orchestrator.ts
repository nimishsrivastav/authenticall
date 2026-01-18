/**
 * Analysis Orchestrator
 * Coordinates analysis workflow between capture and Gemini API
 */

import { getGeminiService, GeminiService } from '../api/gemini-service';
import {
  FrameCapturedMessage,
  TranscriptCapturedMessage,
  MessageType,
  ExtensionSettings,
  TrustScoreSnapshot,
  Alert,
} from '../shared/types';
import { getErrorBoundary } from '../utils/error-boundary';
import { ErrorCode } from '../shared/constants';

export interface AnalysisJob {
  id: string;
  type: 'frame' | 'transcript' | 'fusion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export class AnalysisOrchestrator {
  private geminiService: GeminiService;
  private isRunning: boolean = false;
  private jobs: Map<string, AnalysisJob> = new Map();
  private pendingFrames: Array<{ data: string; timestamp: number }> = [];
  private analysisInterval?: number;
//   private batchSize: number = 3;

  constructor(settings: ExtensionSettings) {
    this.geminiService = getGeminiService(settings);
  }

  /**
   * Initialize orchestrator
   */
  public async initialize(): Promise<void> {
    console.log('[AnalysisOrchestrator] Initializing...');

    try {
      // Initialize Gemini service
      await this.geminiService.initialize();

      console.log('[AnalysisOrchestrator] Initialized successfully');
    } catch (error) {
      const errorBoundary = getErrorBoundary();
      errorBoundary.handleError(ErrorCode.INITIALIZATION_FAILED, error, false);
      throw error;
    }
  }

  /**
   * Start orchestrator
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('[AnalysisOrchestrator] Already running');
      return;
    }

    console.log('[AnalysisOrchestrator] Starting...');

    // Start periodic batch processing
    this.analysisInterval = setInterval(() => {
      this.processBatch();
    }, 5000) as unknown as number; // Process every 5 seconds

    this.isRunning = true;
    console.log('[AnalysisOrchestrator] Started');
  }

  /**
   * Stop orchestrator
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[AnalysisOrchestrator] Stopping...');

    // Clear interval
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    // Wait for pending jobs
    await this.waitForPendingJobs();

    this.isRunning = false;
    console.log('[AnalysisOrchestrator] Stopped');
  }

  /**
   * Handle frame captured message
   */
  public async handleFrameCaptured(
    message: FrameCapturedMessage,
  ): Promise<void> {
    console.log('[AnalysisOrchestrator] Frame captured');

    // Add to pending frames
    this.pendingFrames.push({
      data: message.frameData,
      timestamp: message.timestamp,
    });

    // Keep only recent frames
    if (this.pendingFrames.length > 10) {
      this.pendingFrames.shift();
    }

    // Create job
    const job: AnalysisJob = {
      id: this.generateJobId(),
      type: 'frame',
      status: 'pending',
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);
  }

  /**
   * Handle transcript captured message
   */
  public async handleTranscriptCaptured(
    message: TranscriptCapturedMessage,
  ): Promise<void> {
    console.log('[AnalysisOrchestrator] Transcript captured:', message.text);

    // Create job
    const job: AnalysisJob = {
      id: this.generateJobId(),
      type: 'transcript',
      status: 'processing',
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);

    try {
      // Analyze transcript immediately (high priority)
      const result = await this.geminiService.analyzeTranscript(
        message.text,
        message.speaker,
        'high',
      );

      // Update job
      job.status = 'completed';
      job.completedAt = Date.now();

      // Broadcast results
      await this.broadcastAnalysisResults(undefined, result);
    } catch (error) {
      console.error('[AnalysisOrchestrator] Transcript analysis failed:', error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';

      const errorBoundary = getErrorBoundary();
      errorBoundary.handleError(ErrorCode.API_REQUEST_FAILED, error);
    }
  }

  /**
   * Process batch of pending frames
   */
  private async processBatch(): Promise<void> {
    if (this.pendingFrames.length === 0) {
      return;
    }

    console.log(
      `[AnalysisOrchestrator] Processing batch of ${this.pendingFrames.length} frames`,
    );

    // Get most recent frame
    const latestFrame = this.pendingFrames[this.pendingFrames.length - 1];
    if (!latestFrame) {
      return;
    }

    // Create job
    const job: AnalysisJob = {
      id: this.generateJobId(),
      type: 'fusion',
      status: 'processing',
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);

    try {
      // Perform fusion analysis (combines latest visual + recent behavioral)
      const result = await this.geminiService.performFusionAnalysis(
        latestFrame.data,
      );

      // Update job
      job.status = 'completed';
      job.completedAt = Date.now();

      // Broadcast results
      await this.broadcastFusionResults(result);

      // Clear processed frames
      this.pendingFrames = [];
    } catch (error) {
      console.error('[AnalysisOrchestrator] Batch processing failed:', error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';

      const errorBoundary = getErrorBoundary();
      errorBoundary.handleError(ErrorCode.API_REQUEST_FAILED, error);
    }
  }

  /**
   * Broadcast analysis results to popup
   */
  private async broadcastAnalysisResults(
    visual?: { trustScore: number; confidence: number },
    behavioral?: { trustScore: number; confidence: number },
  ): Promise<void> {
    try {
      // Send trust score update
      await chrome.runtime.sendMessage({
        type: MessageType.TRUST_SCORE_UPDATE,
        timestamp: Date.now(),
        trustScore: {
          overall: Math.round(
            ((visual?.trustScore ?? 75) + (behavioral?.trustScore ?? 75)) / 2,
          ),
          visual: visual?.trustScore ?? 0,
          audio: 75, // Placeholder
          behavioral: behavioral?.trustScore ?? 0,
          confidence: Math.max(
            visual?.confidence ?? 0,
            behavioral?.confidence ?? 0,
          ),
          level: this.determineTrustLevel(
            Math.round(
              ((visual?.trustScore ?? 75) + (behavioral?.trustScore ?? 75)) / 2,
            ),
          ),
        },
      });
    } catch (error) {
      console.error('[AnalysisOrchestrator] Failed to broadcast results:', error);
    }
  }

  /**
   * Broadcast fusion results
   */
  private async broadcastFusionResults(result: {
    trustScore: TrustScoreSnapshot;
    alerts: Alert[];
    summary: string;
  }): Promise<void> {
    try {
      // Send trust score update
      await chrome.runtime.sendMessage({
        type: MessageType.TRUST_SCORE_UPDATE,
        timestamp: Date.now(),
        trustScore: result.trustScore,
      });

      // Send alerts
      for (const alert of result.alerts) {
        await chrome.runtime.sendMessage({
          type: MessageType.ALERT_TRIGGERED,
          timestamp: Date.now(),
          alert: {
            id: alert.id,
            severity: alert.severity,
            category: alert.category,
            title: alert.title,
            message: alert.message,
            details: alert.details,
            actionRequired: alert.actionRequired,
          },
        });

        // Show browser notification if enabled
        if (alert.severity === 'high' || alert.severity === 'critical') {
          await this.showNotification(alert);
        }
      }
    } catch (error) {
      console.error(
        '[AnalysisOrchestrator] Failed to broadcast fusion results:',
        error,
      );
    }
  }

  /**
   * Show browser notification
   */
  private async showNotification(alert: Alert): Promise<void> {
    try {
      await chrome.notifications.create(alert.id, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: alert.title,
        message: alert.message,
        priority: alert.severity === 'critical' ? 2 : 1,
        requireInteraction: alert.actionRequired,
      });
    } catch (error) {
      console.error('[AnalysisOrchestrator] Failed to show notification:', error);
    }
  }

  /**
   * Determine trust level
   */
  private determineTrustLevel(
    score: number,
  ): 'safe' | 'caution' | 'danger' | 'unknown' {
    if (score >= 85) return 'safe';
    if (score >= 50) return 'caution';
    if (score >= 0) return 'danger';
    return 'unknown';
  }

  /**
   * Wait for pending jobs to complete
   */
  private async waitForPendingJobs(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const pending = Array.from(this.jobs.values()).filter(
        (job) => job.status === 'pending' || job.status === 'processing',
      );

      if (pending.length === 0) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.warn('[AnalysisOrchestrator] Timeout waiting for pending jobs');
  }

  /**
   * Generate job ID
   */
  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get job statistics
   */
  public getJobStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    };
  }

  /**
   * Clear job history
   */
  public clearJobHistory(): void {
    this.jobs.clear();
    this.pendingFrames = [];
  }

  /**
   * Update settings
   */
  public async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    await this.geminiService.updateSettings(settings);
  }

  /**
   * Get service statistics
   */
  public getServiceStats(): ReturnType<typeof this.geminiService.getStats> {
    return this.geminiService.getStats();
  }
}