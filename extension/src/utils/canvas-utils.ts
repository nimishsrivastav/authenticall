/**
 * Canvas Utilities
 * Helper functions for canvas operations
 */

/**
 * Create offscreen canvas for better performance
 */
export function createOffscreenCanvas(
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Get 2D context with optimizations
 */
export function get2DContext(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D | null {
  return canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
    ...options,
  });
}

/**
 * Resize canvas maintaining aspect ratio
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
): void {
  const aspectRatio = canvas.width / canvas.height;

  let newWidth = canvas.width;
  let newHeight = canvas.height;

  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  canvas.width = Math.round(newWidth);
  canvas.height = Math.round(newHeight);
}

/**
 * Clear canvas
 */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Convert canvas to base64 with quality
 */
export function canvasToBase64(
  canvas: HTMLCanvasElement,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.8,
): string {
  return canvas.toDataURL(format, quality);
}

/**
 * Convert canvas to blob (for better performance)
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.8,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, format, quality);
  });
}

/**
 * Draw image to canvas with scaling
 */
export function drawImageScaled(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.drawImage(image, x, y, width, height);
}

/**
 * Apply image filters
 */
export function applyFilters(
  ctx: CanvasRenderingContext2D,
  filters: {
    brightness?: number;
    contrast?: number;
    grayscale?: boolean;
    blur?: number;
  },
): void {
  const filterArray: string[] = [];

  if (filters.brightness !== undefined) {
    filterArray.push(`brightness(${filters.brightness}%)`);
  }

  if (filters.contrast !== undefined) {
    filterArray.push(`contrast(${filters.contrast}%)`);
  }

  if (filters.grayscale) {
    filterArray.push('grayscale(100%)');
  }

  if (filters.blur !== undefined) {
    filterArray.push(`blur(${filters.blur}px)`);
  }

  ctx.filter = filterArray.join(' ');
}

/**
 * Get image data from canvas
 */
export function getImageData(
  canvas: HTMLCanvasElement,
): ImageData | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Put image data to canvas
 */
export function putImageData(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
  }
}

/**
 * Calculate scaled dimensions
 */
export function calculateScaledDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight?: number,
): { width: number; height: number } {
  const aspectRatio = sourceWidth / sourceHeight;

  let width = sourceWidth;
  let height = sourceHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Clone canvas
 */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const clone = createOffscreenCanvas(source.width, source.height);
  const ctx = get2DContext(clone);

  if (ctx) {
    ctx.drawImage(source, 0, 0);
  }

  return clone;
}