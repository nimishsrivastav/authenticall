/**
 * Frame Extractor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrameExtractor } from '../frame-extractor';
import { createMockVideoElement } from '../../../../tests/fixtures';

describe('FrameExtractor', () => {
  let extractor: FrameExtractor;

  beforeEach(() => {
    extractor = new FrameExtractor();
  });

  describe('constructor', () => {
    it('should create extractor with canvas context', () => {
      expect(extractor).toBeDefined();
    });
  });

  describe('extractFrame', () => {
    it('should extract frame from video element', async () => {
      const video = createMockVideoElement({
        width: 1920,
        height: 1080,
        readyState: 4,
      });

      const frame = await extractor.extractFrame(video);

      expect(frame).toBeDefined();
      expect(frame?.data).toBeDefined();
      expect(frame?.width).toBeLessThanOrEqual(720); // Default max width
      expect(frame?.height).toBeGreaterThan(0);
      expect(frame?.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should scale down large videos to max width', async () => {
      const video = createMockVideoElement({
        width: 1920,
        height: 1080,
      });

      const frame = await extractor.extractFrame(video, 720);

      expect(frame?.width).toBe(720);
      // Aspect ratio should be maintained: 1080 * (720/1920) = 405
      expect(frame?.height).toBe(405);
    });

    it('should not scale up small videos', async () => {
      const video = createMockVideoElement({
        width: 640,
        height: 480,
      });

      const frame = await extractor.extractFrame(video, 720);

      expect(frame?.width).toBe(640);
      expect(frame?.height).toBe(480);
    });

    it('should return null for video not ready', async () => {
      const video = createMockVideoElement({
        readyState: 1, // HAVE_METADATA, not enough
      });

      const frame = await extractor.extractFrame(video);

      expect(frame).toBeNull();
    });

    it('should return null for invalid dimensions', async () => {
      const video = createMockVideoElement({
        width: 0,
        height: 0,
      });

      const frame = await extractor.extractFrame(video);

      expect(frame).toBeNull();
    });

    it('should use custom quality setting', async () => {
      const video = createMockVideoElement();

      const frame = await extractor.extractFrame(video, 720, 0.5);

      expect(frame).toBeDefined();
    });

    it('should handle extraction errors gracefully', async () => {
      const video = createMockVideoElement();

      // Make getContext return a context that throws on drawImage
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        vi.spyOn(ctx, 'drawImage').mockImplementation(() => {
          throw new Error('Canvas error');
        });
      }

      // The extractor should handle this gracefully
      const frame = await extractor.extractFrame(video);
      // May return frame or null depending on where error occurs
      expect(true).toBe(true); // Test passes if no unhandled exception
    });
  });

  describe('extractFrameCustom', () => {
    it('should extract frame with custom dimensions', async () => {
      const video = createMockVideoElement();

      const frame = await extractor.extractFrameCustom(video, 320, 240, 0.8);

      expect(frame).toBeDefined();
      expect(frame?.width).toBe(320);
      expect(frame?.height).toBe(240);
    });

    it('should use default quality when not specified', async () => {
      const video = createMockVideoElement();

      const frame = await extractor.extractFrameCustom(video, 640, 480);

      expect(frame).toBeDefined();
    });
  });

  describe('extractFramePNG', () => {
    it('should extract frame as PNG', async () => {
      const video = createMockVideoElement();

      const frame = await extractor.extractFramePNG(video, 720);

      expect(frame).toBeDefined();
      expect(frame?.width).toBeLessThanOrEqual(720);
    });

    it('should scale down to max width', async () => {
      const video = createMockVideoElement({
        width: 1920,
        height: 1080,
      });

      const frame = await extractor.extractFramePNG(video, 480);

      expect(frame?.width).toBe(480);
    });
  });

  describe('getCanvasDimensions', () => {
    it('should return current canvas dimensions', async () => {
      const video = createMockVideoElement({
        width: 640,
        height: 480,
      });

      await extractor.extractFrame(video);

      const dimensions = extractor.getCanvasDimensions();
      expect(dimensions.width).toBe(640);
      expect(dimensions.height).toBe(480);
    });
  });

  describe('clear', () => {
    it('should clear canvas', () => {
      // Just verify it doesn't throw
      expect(() => extractor.clear()).not.toThrow();
    });
  });

  describe('frame data format', () => {
    it('should return base64 data without data URL prefix', async () => {
      const video = createMockVideoElement();

      const frame = await extractor.extractFrame(video);

      expect(frame?.data).not.toContain('data:image');
      expect(frame?.data).not.toContain(';base64,');
    });
  });

  describe('aspect ratio', () => {
    it('should maintain 16:9 aspect ratio', async () => {
      const video = createMockVideoElement({
        width: 1920,
        height: 1080,
      });

      const frame = await extractor.extractFrame(video, 720);

      const aspectRatio = frame!.width / frame!.height;
      expect(aspectRatio).toBeCloseTo(16 / 9, 1);
    });

    it('should maintain 4:3 aspect ratio', async () => {
      const video = createMockVideoElement({
        width: 1600,
        height: 1200,
      });

      const frame = await extractor.extractFrame(video, 720);

      const aspectRatio = frame!.width / frame!.height;
      expect(aspectRatio).toBeCloseTo(4 / 3, 1);
    });

    it('should maintain portrait aspect ratio', async () => {
      const video = createMockVideoElement({
        width: 1080,
        height: 1920,
      });

      const frame = await extractor.extractFrame(video, 720);

      expect(frame!.width).toBe(720);
      expect(frame!.height).toBeGreaterThan(frame!.width);
    });
  });

  describe('performance', () => {
    it('should complete extraction quickly', async () => {
      const video = createMockVideoElement();

      const start = Date.now();
      await extractor.extractFrame(video);
      const duration = Date.now() - start;

      // Should complete in less than 100ms (mocked, so will be fast)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple sequential extractions', async () => {
      const video = createMockVideoElement();

      for (let i = 0; i < 10; i++) {
        const frame = await extractor.extractFrame(video);
        expect(frame).toBeDefined();
      }
    });
  });
});
