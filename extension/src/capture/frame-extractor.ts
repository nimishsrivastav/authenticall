/**
 * Frame Extractor
 * Extracts frames from video elements using canvas
 */

export interface ExtractedFrame {
  data: string; // Base64 encoded JPEG
  width: number;
  height: number;
  timestamp: number;
}

export class FrameExtractor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    // Create off-screen canvas for frame extraction
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });

    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    this.ctx = ctx;
  }

  /**
   * Extract frame from video element
   */
  public async extractFrame(
    videoElement: HTMLVideoElement,
    maxWidth: number = 720,
    quality: number = 0.8,
  ): Promise<ExtractedFrame | null> {
    try {
      // Check if video is ready
      if (videoElement.readyState < 2) {
        console.warn('[FrameExtractor] Video not ready');
        return null;
      }

      // Get video dimensions
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) {
        console.warn('[FrameExtractor] Invalid video dimensions');
        return null;
      }

      // Calculate scaled dimensions (maintain aspect ratio)
      let width = videoWidth;
      let height = videoHeight;

      if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * scale);
      }

      // Set canvas dimensions
      this.canvas.width = width;
      this.canvas.height = height;

      // Draw video frame to canvas
      this.ctx.drawImage(videoElement, 0, 0, width, height);

      // Convert to base64 JPEG
      const base64Data = this.canvas.toDataURL('image/jpeg', quality);

      // Remove data URL prefix
      const data = base64Data.replace(/^data:image\/jpeg;base64,/, '');

      return {
        data,
        width,
        height,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[FrameExtractor] Frame extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract frame with custom dimensions
   */
  public async extractFrameCustom(
    videoElement: HTMLVideoElement,
    width: number,
    height: number,
    quality: number = 0.8,
  ): Promise<ExtractedFrame | null> {
    try {
      // Set canvas dimensions
      this.canvas.width = width;
      this.canvas.height = height;

      // Draw video frame to canvas
      this.ctx.drawImage(videoElement, 0, 0, width, height);

      // Convert to base64 JPEG
      const base64Data = this.canvas.toDataURL('image/jpeg', quality);
      const data = base64Data.replace(/^data:image\/jpeg;base64,/, '');

      return {
        data,
        width,
        height,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[FrameExtractor] Custom frame extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract frame as PNG (for higher quality, larger size)
   */
  public async extractFramePNG(
    videoElement: HTMLVideoElement,
    maxWidth: number = 720,
  ): Promise<ExtractedFrame | null> {
    try {
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;

      let width = videoWidth;
      let height = videoHeight;

      if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * scale);
      }

      this.canvas.width = width;
      this.canvas.height = height;

      this.ctx.drawImage(videoElement, 0, 0, width, height);

      const base64Data = this.canvas.toDataURL('image/png');
      const data = base64Data.replace(/^data:image\/png;base64,/, '');

      return {
        data,
        width,
        height,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[FrameExtractor] PNG extraction failed:', error);
      return null;
    }
  }

  /**
   * Get canvas dimensions
   */
  public getCanvasDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Clear canvas
   */
  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}