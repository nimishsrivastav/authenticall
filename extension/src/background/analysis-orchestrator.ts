/**
 * Analysis Orchestrator
 * Coordinates analysis workflow between capture and Gemini API
 * Integrates with Phase 5 TrustScoringService for advanced scoring and alerts
 */

import { getGeminiService, GeminiService } from '../api/gemini-service';
import {
  FrameCapturedMessage,
  TranscriptCapturedMessage,
  MessageType,
  ExtensionSettings,
  TrustScoreSnapshot,
  Alert,
  Platform,
} from '../shared/types';
import { getErrorBoundary } from '../utils/error-boundary';
import { ErrorCode } from '../shared/constants';
import {
  TrustScoringService,
  getTrustScoringService,
} from '../services/trust-scoring-service';
import { VisualAnalysisResult } from '../analysis/visual-analyzer';
import { BehavioralAnalysisResult } from '../analysis/behavioral-analyzer';

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
  private trustScoringService: TrustScoringService;
  private isRunning: boolean = false;
  private jobs: Map<string, AnalysisJob> = new Map();
  private pendingFrames: Array<{ data: string; timestamp: number }> = [];
  private analysisInterval?: number;
  private lastVisualResult?: VisualAnalysisResult;
  private lastBehavioralResult?: BehavioralAnalysisResult;

  constructor(settings: ExtensionSettings) {
    this.geminiService = getGeminiService(settings);
    this.trustScoringService = getTrustScoringService();
  }

  /**
   * Initialize orchestrator
   */
  public async initialize(): Promise<void> {
    console.log('[AnalysisOrchestrator] Initializing...');

    try {
      // Initialize Gemini service
      await this.geminiService.initialize();

      // Initialize Trust Scoring Service
      await this.trustScoringService.initialize();

      console.log('[AnalysisOrchestrator] Initialized successfully');
    } catch (error) {
      const errorBoundary = getErrorBoundary();
      errorBoundary.handleError(ErrorCode.INITIALIZATION_FAILED, error, false);
      throw error;
    }
  }

  /**
   * Start monitoring session
   */
  public async startSession(
    platform: Platform,
    url: string,
    participantCount: number = 1,
  ): Promise<void> {
    await this.trustScoringService.startSession(platform, url, participantCount);
  }

  /**
   * End monitoring session
   */
  public async endSession(): Promise<void> {
    await this.trustScoringService.endSession();
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

      // Store for fusion analysis
      this.lastBehavioralResult = result;

      // Update job
      job.status = 'completed';
      job.completedAt = Date.now();

      // Process through TrustScoringService
      const { score, alerts } = await this.trustScoringService.processAnalysisResults({
        behavioral: result,
      });

      // Broadcast results
      await this.broadcastScoringResults(score, alerts);
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
      // Perform visual analysis
      const visualResult = await this.geminiService.analyzeFrame(latestFrame.data);
      this.lastVisualResult = visualResult;

      // Update job
      job.status = 'completed';
      job.completedAt = Date.now();

      // Process through TrustScoringService with both visual and last behavioral
      const analysisInput: { visual?: VisualAnalysisResult; behavioral?: BehavioralAnalysisResult } = {
        visual: this.lastVisualResult,
      };
      if (this.lastBehavioralResult) {
        analysisInput.behavioral = this.lastBehavioralResult;
      }
      const { score, alerts } = await this.trustScoringService.processAnalysisResults(analysisInput);

      // Broadcast results
      await this.broadcastScoringResults(score, alerts);

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
   * Broadcast scoring results from TrustScoringService
   */
  private async broadcastScoringResults(
    score: TrustScoreSnapshot,
    alerts: Alert[],
  ): Promise<void> {
    try {
      // Send trust score update
      await chrome.runtime.sendMessage({
        type: MessageType.TRUST_SCORE_UPDATE,
        timestamp: Date.now(),
        trustScore: score,
      });

      // Send alerts
      for (const alert of alerts) {
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
      }
    } catch (error) {
      console.error('[AnalysisOrchestrator] Failed to broadcast scoring results:', error);
    }
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

  /**
   * Get trust scoring statistics
   */
  public getTrustScoringStats(): ReturnType<typeof this.trustScoringService.getSessionStatistics> {
    return this.trustScoringService.getSessionStatistics();
  }

  /**
   * Get current trust score
   */
  public getCurrentTrustScore(): TrustScoreSnapshot | null {
    return this.trustScoringService.getCurrentScore();
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return this.trustScoringService.getActiveAlerts();
  }

  /**
   * Dismiss an alert
   */
  public dismissAlert(alertId: string): boolean {
    return this.trustScoringService.dismissAlert(alertId);
  }

  /**
   * Check if session is active
   */
  public isSessionActive(): boolean {
    return this.trustScoringService.isSessionActive();
  }

  /**
   * Get trust scoring service
   */
  public getTrustScoringService(): TrustScoringService {
    return this.trustScoringService;
  }
}