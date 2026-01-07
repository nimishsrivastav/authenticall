/**
 * Transcript Extractor
 * Extracts transcripts/captions from video conferencing platforms
 */

import { Platform, MessageType, TranscriptCapturedMessage } from '../shared/types';
import { TRANSCRIPT_SELECTORS } from '../shared/constants';

export class TranscriptExtractor {
  private platform: Platform;
  private transcriptCount: number = 0;
  private lastTranscriptText: string = '';
  private observer?: MutationObserver;
  private isInitialized: boolean = false;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  /**
   * Initialize transcript extractor
   */
  public initialize(): void {
    console.log('[TranscriptExtractor] Initializing...');

    try {
      // Set up transcript observer
      this.setupTranscriptObserver();

      this.isInitialized = true;
      console.log('[TranscriptExtractor] Initialized');
    } catch (error) {
      console.error('[TranscriptExtractor] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up observer for transcript changes
   */
  private setupTranscriptObserver(): void {
    const selectors = TRANSCRIPT_SELECTORS[this.platform];

    // Create mutation observer
    this.observer = new MutationObserver(() => {
      this.extractTranscript();
    });

    // Try to find and observe transcript containers
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach((element) => {
          // Observe the transcript container for changes
          this.observer?.observe(element, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        });

        if (elements.length > 0) {
          console.log(`[TranscriptExtractor] Observing ${elements.length} transcript containers`);
        }
      } catch (error) {
        console.warn('[TranscriptExtractor] Failed to observe selector:', selector, error);
      }
    }

    // Also observe the entire document for new transcript containers
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('[TranscriptExtractor] Transcript observer set up');
  }

  /**
   * Extract transcript from page
   */
  private extractTranscript(): void {
    if (!this.isInitialized) {
      return;
    }

    const selectors = TRANSCRIPT_SELECTORS[this.platform];
    let transcriptText = '';
    let speaker: string | undefined;

    // Try each selector to find transcript
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length > 0) {
          // Get the most recent transcript element
          const latestElement = elements[elements.length - 1];
          
          if (latestElement) {
            transcriptText = latestElement.textContent?.trim() || '';
            
            // Try to extract speaker name (platform-specific)
            speaker = this.extractSpeaker(latestElement);
            
            break;
          }
        }
      } catch (error) {
        console.warn('[TranscriptExtractor] Failed to extract from selector:', selector, error);
      }
    }

    // Only send if we have new transcript text
    if (transcriptText && transcriptText !== this.lastTranscriptText) {
      const message: TranscriptCapturedMessage = {
        type: MessageType.TRANSCRIPT_CAPTURED,
        timestamp: Date.now(),
        text: transcriptText,
        confidence: this.estimateConfidence(transcriptText),
      };
      if (speaker !== undefined) {
        message.speaker = speaker;
      }
      this.sendTranscriptToBackground(message);

      this.lastTranscriptText = transcriptText;
      this.transcriptCount++;
    }
  }

  /**
   * Extract speaker name from transcript element
   */
  private extractSpeaker(element: Element): string | undefined {
    // Try to find speaker name in parent elements
    let current: Element | null = element;
    
    while (current) {
      // Google Meet speaker format
      const speakerElement = current.querySelector('[class*="speaker"]');
      if (speakerElement?.textContent) {
        return speakerElement.textContent.trim();
      }

      // Zoom speaker format
      const zoomSpeaker = current.getAttribute('aria-label');
      if (zoomSpeaker) {
        return zoomSpeaker;
      }

      current = current.parentElement;
    }

    return undefined;
  }

  /**
   * Estimate transcript confidence
   * Based on text length and completeness
   */
  private estimateConfidence(text: string): number {
    // Simple heuristic: longer, complete sentences = higher confidence
    const hasEndPunctuation = /[.!?]$/.test(text);
    const wordCount = text.split(/\s+/).length;

    let confidence = 0.5; // Base confidence

    // Increase confidence for complete sentences
    if (hasEndPunctuation) {
      confidence += 0.2;
    }

    // Increase confidence based on length
    if (wordCount >= 5) {
      confidence += 0.2;
    }
    if (wordCount >= 10) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Send transcript to background script
   */
  private async sendTranscriptToBackground(message: TranscriptCapturedMessage): Promise<void> {
    try {
      await chrome.runtime.sendMessage(message);
      console.log('[TranscriptExtractor] Transcript sent:', message.text.substring(0, 50) + '...');
    } catch (error) {
      console.error('[TranscriptExtractor] Failed to send transcript to background:', error);
    }
  }

  /**
   * Stop transcript extraction
   */
  public stop(): void {
    console.log('[TranscriptExtractor] Stopping...');

    if (this.observer) {
      this.observer.disconnect();
    }

    this.isInitialized = false;
  }

  /**
   * Get transcript count
   */
  public getTranscriptCount(): number {
    return this.transcriptCount;
  }

  /**
   * Get last transcript
   */
  public getLastTranscript(): string {
    return this.lastTranscriptText;
  }

  /**
   * Manually trigger transcript extraction
   */
  public manualExtract(): void {
    this.extractTranscript();
  }
}