/**
 * Gemini Service
 * High-level service orchestrating all Gemini API operations
 */

import { GeminiClient } from './gemini-client';
import { VisualAnalyzer, VisualAnalysisResult } from '../analysis/visual-analyzer';
import {
  BehavioralAnalyzer,
  BehavioralAnalysisResult,
} from '../analysis/behavioral-analyzer';
import { FusionAnalyzer, FusionAnalysisResult } from '../analysis/fusion-analyzer';
import { getRequestQueue } from './request-queue';
import { ExtensionSettings } from '../shared/types';

export interface AnalysisRequest {
  type: 'visual' | 'behavioral' | 'fusion';
  data: {
    frameData?: string;
    transcript?: string;
    speaker?: string;
  };
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export class GeminiService {
  private client: GeminiClient;
  private visualAnalyzer: VisualAnalyzer;
  private behavioralAnalyzer: BehavioralAnalyzer;
  private fusionAnalyzer: FusionAnalyzer;
  private requestQueue = getRequestQueue();
  private isInitialized: boolean = false;
  private settings: ExtensionSettings;

  constructor(settings: ExtensionSettings) {
    this.settings = settings;
    this.client = new GeminiClient(settings.apiKey);
    this.visualAnalyzer = new VisualAnalyzer(this.client, settings.geminiModel);
    this.behavioralAnalyzer = new BehavioralAnalyzer(
      this.client,
      settings.geminiModel,
    );
    this.fusionAnalyzer = new FusionAnalyzer();
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[GeminiService] Already initialized');
      return;
    }

    console.log('[GeminiService] Initializing...');

    try {
      // Validate API key
      const isValid = await this.client.validateApiKey();
      if (!isValid) {
        throw new Error('Invalid Gemini API key');
      }

      // Update request queue settings
      this.requestQueue.updateMaxConcurrent(
        this.settings.captureSettings.maxConcurrentRequests,
      );

      this.isInitialized = true;
      console.log('[GeminiService] Initialized successfully');
    } catch (error) {
      console.error('[GeminiService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Analyze video frame
   */
  public async analyzeFrame(
    frameData: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
  ): Promise<VisualAnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('GeminiService not initialized');
    }

    return await this.requestQueue.enqueue(
      () => this.visualAnalyzer.analyzeFrame(frameData),
      priority,
    );
  }

  /**
   * Analyze transcript
   */
  public async analyzeTranscript(
    text: string,
    speaker?: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
  ): Promise<BehavioralAnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('GeminiService not initialized');
    }

    return await this.requestQueue.enqueue(
      () => this.behavioralAnalyzer.analyzeTranscript(text, speaker),
      priority,
    );
  }

  /**
   * Perform fusion analysis
   */
  public async performFusionAnalysis(
    frameData?: string,
    transcript?: string,
    speaker?: string,
  ): Promise<FusionAnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('GeminiService not initialized');
    }

    let visual: VisualAnalysisResult | undefined;
    let behavioral: BehavioralAnalysisResult | undefined;

    // Analyze frame if provided
    if (frameData) {
      try {
        visual = await this.analyzeFrame(frameData, 'high');
      } catch (error) {
        console.error('[GeminiService] Visual analysis failed:', error);
      }
    }

    // Analyze transcript if provided
    if (transcript) {
      try {
        behavioral = await this.analyzeTranscript(transcript, speaker, 'high');
      } catch (error) {
        console.error('[GeminiService] Behavioral analysis failed:', error);
      }
    }

    // Fuse results
    return this.fusionAnalyzer.fuseAnalysis(visual, behavioral);
  }

  /**
   * Analyze conversation context
   */
  public async analyzeConversationContext(): Promise<BehavioralAnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('GeminiService not initialized');
    }

    return await this.requestQueue.enqueue(
      () => this.behavioralAnalyzer.analyzeConversationContext(),
      'high',
    );
  }

  /**
   * Batch analyze frames
   */
  public async analyzeFrameBatch(
    frames: Array<{ data: string; timestamp: number }>,
  ): Promise<VisualAnalysisResult[]> {
    if (!this.isInitialized) {
      throw new Error('GeminiService not initialized');
    }

    return await this.requestQueue.enqueue(
      () => this.visualAnalyzer.analyzeBatch(frames),
      'low',
    );
  }

  /**
   * Update settings
   */
  public async updateSettings(newSettings: Partial<ExtensionSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };

    // Update API key if changed
    if (newSettings.apiKey) {
      this.client.updateApiKey(newSettings.apiKey);
      
      // Re-validate
      const isValid = await this.client.validateApiKey();
      if (!isValid) {
        throw new Error('Invalid Gemini API key');
      }
    }

    // Update model if changed
    if (newSettings.geminiModel) {
      this.visualAnalyzer.updateModel(newSettings.geminiModel);
      this.behavioralAnalyzer.updateModel(newSettings.geminiModel);
    }

    // Update request queue settings
    if (newSettings.captureSettings?.maxConcurrentRequests) {
      this.requestQueue.updateMaxConcurrent(
        newSettings.captureSettings.maxConcurrentRequests,
      );
    }

    console.log('[GeminiService] Settings updated');
  }

  /**
   * Clear all analysis history
   */
  public clearHistory(): void {
    this.behavioralAnalyzer.clearHistory();
    this.fusionAnalyzer.clearHistory();
    console.log('[GeminiService] History cleared');
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    queueStats: ReturnType<ReturnType<typeof getRequestQueue>['getStats']>;
    conversationHistory: number;
    isInitialized: boolean;
  } {
    return {
      queueStats: this.requestQueue.getStats(),
      conversationHistory: this.behavioralAnalyzer.getHistory().length,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    console.log('[GeminiService] Shutting down...');

    // Wait for pending requests
    await this.requestQueue.waitForEmpty();

    // Clear queue
    this.requestQueue.clear();

    // Clear history
    this.clearHistory();

    this.isInitialized = false;
    console.log('[GeminiService] Shutdown complete');
  }

  /**
   * Test connection to Gemini API
   */
  public async testConnection(): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.client.validateApiKey();
      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current model information
   */
  public async getModelInfo(): Promise<unknown> {
    if (!this.isInitialized) {
      throw new Error('GeminiService not initialized');
    }

    return await this.client.getModelInfo(this.settings.geminiModel);
  }
}

/**
 * Global service instance
 */
let globalService: GeminiService | null = null;

/**
 * Get or create global service instance
 */
export function getGeminiService(settings?: ExtensionSettings): GeminiService {
  if (!globalService && settings) {
    globalService = new GeminiService(settings);
  } else if (!globalService) {
    throw new Error('GeminiService not initialized. Provide settings first.');
  }
  return globalService;
}

/**
 * Reset global service instance
 */
export function resetGeminiService(): void {
  globalService = null;
}