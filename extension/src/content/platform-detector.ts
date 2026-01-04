/**
 * Platform Detector
 * Detects and monitors platform-specific features
 */

import { Platform } from '../shared/types';
import {
  PARTICIPANT_SELECTORS,
  CONTROL_SELECTORS,
  isPlatformFeatureSupported,
} from '../shared/constants';

export class PlatformDetector {
  private platform: Platform;
  private isActive: boolean = false;
  private participantCount: number = 0;
  private observers: MutationObserver[] = [];

  constructor(platform: Platform) {
    this.platform = platform;
  }

  /**
   * Start platform detection
   */
  public start(): void {
    if (this.isActive) {
      console.warn('[PlatformDetector] Already active');
      return;
    }

    console.log('[PlatformDetector] Starting for platform:', this.platform);

    // Check platform features
    this.checkPlatformFeatures();

    // Set up participant detection
    if (isPlatformFeatureSupported(this.platform, 'participantDetectionSupported')) {
      this.setupParticipantDetection();
    }

    // Set up meeting state detection
    this.setupMeetingStateDetection();

    this.isActive = true;
  }

  /**
   * Stop platform detection
   */
  public stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log('[PlatformDetector] Stopping');

    // Disconnect all observers
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];

    this.isActive = false;
  }

  /**
   * Check platform features
   */
  private checkPlatformFeatures(): void {
    const features = {
      video: isPlatformFeatureSupported(this.platform, 'videoCaptureSupported'),
      audio: isPlatformFeatureSupported(this.platform, 'audioCaptureSupported'),
      transcript: isPlatformFeatureSupported(this.platform, 'transcriptSupported'),
      participants: isPlatformFeatureSupported(this.platform, 'participantDetectionSupported'),
    };

    console.log('[PlatformDetector] Platform features:', features);
  }

  /**
   * Set up participant detection
   */
  private setupParticipantDetection(): void {
    console.log('[PlatformDetector] Setting up participant detection');

    const selectors = PARTICIPANT_SELECTORS[this.platform];
    
    // Try each selector
    for (const selector of selectors) {
      try {
        const observer = new MutationObserver(() => {
          this.updateParticipantCount(selector);
        });

        // Observe document for participant changes
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        this.observers.push(observer);

        // Initial count
        this.updateParticipantCount(selector);
      } catch (error) {
        console.warn('[PlatformDetector] Failed to set up observer for:', selector, error);
      }
    }
  }

  /**
   * Update participant count
   */
  private updateParticipantCount(selector: string): void {
    try {
      const participants = document.querySelectorAll(selector);
      const newCount = participants.length;

      if (newCount !== this.participantCount) {
        console.log('[PlatformDetector] Participant count changed:', newCount);
        this.participantCount = newCount;

        // Notify background script
        chrome.runtime.sendMessage({
          type: 'PARTICIPANT_COUNT_CHANGED',
          count: newCount,
        });
      }
    } catch (error) {
      console.warn('[PlatformDetector] Failed to update participant count:', error);
    }
  }

  /**
   * Set up meeting state detection
   */
  private setupMeetingStateDetection(): void {
    console.log('[PlatformDetector] Setting up meeting state detection');

    const controlSelectors = CONTROL_SELECTORS[this.platform];
    if (!controlSelectors) {
      console.warn('[PlatformDetector] No control selectors for platform:', this.platform);
      return;
    }

    const { leave } = controlSelectors;

    // Monitor for leave button (indicates meeting is active)
    const checkMeetingActive = () => {
      const leaveButton = leave
        .map((selector: string) => document.querySelector(selector))
        .find((el: Element | null) => el !== null);

      if (leaveButton) {
        console.log('[PlatformDetector] Meeting is active');
        // Meeting is active
      }
    };

    // Check periodically
    const interval = setInterval(checkMeetingActive, 5000);

    // Store interval for cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.observers.push({ disconnect: () => clearInterval(interval) } as any);
  }

  /**
   * Get current participant count
   */
  public getParticipantCount(): number {
    return this.participantCount;
  }

  /**
   * Check if meeting is active
   */
  public isMeetingActive(): boolean {
    const controlSelectors = CONTROL_SELECTORS[this.platform];
    if (!controlSelectors) {
      return false;
    }
    
    const { leave } = controlSelectors;
    
    return leave
      .map((selector: string) => document.querySelector(selector))
      .some((el: Element | null) => el !== null);
  }
}