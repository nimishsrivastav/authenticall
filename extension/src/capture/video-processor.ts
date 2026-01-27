/**
 * Video Processor
 * Handles video frame extraction from video conferencing streams
 */

import { Platform, MessageType, FrameCapturedMessage } from '../shared/types';
import { VIDEO_SELECTORS } from '../shared/constants';
import { BufferManager } from './buffer-manager';
import { FrameExtractor } from './frame-extractor';

export class VideoProcessor {
  private platform: Platform;
  private bufferManager: BufferManager;
  private frameExtractor: FrameExtractor;
  private videoElements: HTMLVideoElement[] = [];
  private frameCount: number = 0;
  private isInitialized: boolean = false;

  constructor(platform: Platform, bufferManager: BufferManager) {
    this.platform = platform;
    this.bufferManager = bufferManager;
    this.frameExtractor = new FrameExtractor();
  }

  /**
   * Initialize video processor
   */
  public async initialize(): Promise<void> {
    console.log('[VideoProcessor] Initializing...');

    try {
      // Find video elements
      this.findVideoElements();

      // Set up video element observer
      this.setupVideoObserver();

      this.isInitialized = true;
      console.log(`[VideoProcessor] Initialized with ${this.videoElements.length} video elements`);
    } catch (error) {
      console.error('[VideoProcessor] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Find video elements on the page
   */
  private findVideoElements(): void {
    const selectors = VIDEO_SELECTORS[this.platform];
    const videoSet = new Set<HTMLVideoElement>();

    // Try each selector
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll<HTMLVideoElement>(selector);
        elements.forEach((el) => {
          // Include video elements that have some data loaded (readyState >= 1)
          // or have valid dimensions (may be ready but paused)
          if (el.readyState >= 1 || (el.videoWidth > 0 && el.videoHeight > 0)) {
            videoSet.add(el);
          }
        });
      } catch (error) {
        console.warn('[VideoProcessor] Failed to query selector:', selector, error);
      }
    }

    // Fallback: if no videos found with specific selectors, try generic video selector
    if (videoSet.size === 0) {
      const allVideos = document.querySelectorAll<HTMLVideoElement>('video');
      allVideos.forEach((el) => {
        if (el.readyState >= 1 || (el.videoWidth > 0 && el.videoHeight > 0)) {
          videoSet.add(el);
        }
      });
    }

    this.videoElements = Array.from(videoSet);
    console.log(`[VideoProcessor] Found ${this.videoElements.length} active video elements`);
  }

  /**
   * Set up observer for new video elements
   */
  private setupVideoObserver(): void {
    const observer = new MutationObserver(() => {
      // Re-scan for video elements when DOM changes
      this.findVideoElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('[VideoProcessor] Video observer set up');
  }

  /**
   * Capture frame from video element
   */
  public async captureFrame(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[VideoProcessor] Not initialized');
      return;
    }

    // Refresh video elements if none available
    if (this.videoElements.length === 0) {
      this.findVideoElements();
    }

    // Get the primary video (first in list, usually the main speaker)
    const videoElement = this.videoElements[0];

    if (!videoElement) {
      // This is expected when joining a meeting before video starts
      console.debug('[VideoProcessor] No video elements available yet');
      return;
    }

    // Verify the video element is still valid and has content
    if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
      console.debug('[VideoProcessor] Video element not ready for capture');
      return;
    }

    try {
      // Extract frame
      const frameData = await this.frameExtractor.extractFrame(videoElement);

      if (!frameData) {
        console.warn('[VideoProcessor] Failed to extract frame');
        return;
      }

      // Store in buffer
      const bufferId = this.bufferManager.add(frameData.data, 'video');

      // Send to background
      const message: FrameCapturedMessage = {
        type: MessageType.FRAME_CAPTURED,
        timestamp: Date.now(),
        frameData: frameData.data,
        width: frameData.width,
        height: frameData.height,
      };
      const participantId = this.getParticipantId(videoElement);
      if (participantId !== undefined) {
        message.participantId = participantId;
      }
      await this.sendFrameToBackground(message);

      this.frameCount++;

      // Clean up buffer
      this.bufferManager.remove(bufferId);
    } catch (error) {
      console.error('[VideoProcessor] Frame capture failed:', error);
    }
  }

  /**
   * Get participant ID from video element
   */
  private getParticipantId(videoElement: HTMLVideoElement): string | undefined {
    // Try to extract participant ID from parent elements
    let element: Element | null = videoElement;
    
    while (element) {
      // Google Meet uses data-participant-id
      const participantId = element.getAttribute('data-participant-id');
      if (participantId) {
        return participantId;
      }

      // Zoom uses different attributes
      const zoomId = element.getAttribute('data-user-id');
      if (zoomId) {
        return zoomId;
      }

      element = element.parentElement;
    }

    return undefined;
  }

  /**
   * Send frame to background script
   */
  private async sendFrameToBackground(message: FrameCapturedMessage): Promise<void> {
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('[VideoProcessor] Failed to send frame to background:', error);
    }
  }

  /**
   * Stop video processing
   */
  public stop(): void {
    console.log('[VideoProcessor] Stopping...');
    this.videoElements = [];
    this.isInitialized = false;
  }

  /**
   * Get frame count
   */
  public getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Get active video element count
   */
  public getVideoElementCount(): number {
    return this.videoElements.length;
  }
}