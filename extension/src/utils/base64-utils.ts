/**
 * Base64 Utilities
 * Helper functions for base64 encoding/decoding
 */

/**
 * Encode string to base64
 */
export function encodeBase64(str: string): string {
  return btoa(str);
}

/**
 * Decode base64 to string
 */
export function decodeBase64(base64: string): string {
  return atob(base64);
}

/**
 * Encode Uint8Array to base64
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  let binary = '';
  const len = array.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(array[i] ?? 0);
  }
  
  return btoa(binary);
}

/**
 * Decode base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Encode Float32Array to base64
 */
export function float32ArrayToBase64(array: Float32Array): string {
  const uint8Array = new Uint8Array(array.buffer);
  return uint8ArrayToBase64(uint8Array);
}

/**
 * Decode base64 to Float32Array
 */
export function base64ToFloat32Array(base64: string): Float32Array {
  const uint8Array = base64ToUint8Array(base64);
  return new Float32Array(uint8Array.buffer);
}

/**
 * Get data URL from base64
 */
export function getDataURL(
  base64: string,
  mimeType: string = 'image/jpeg',
): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Extract base64 from data URL
 */
export function extractBase64FromDataURL(dataURL: string): string {
  const match = dataURL.match(/^data:[^;]+;base64,(.+)$/);
  return match?.[1] ?? '';
}

/**
 * Get mime type from data URL
 */
export function getMimeTypeFromDataURL(dataURL: string): string | null {
  const match = dataURL.match(/^data:([^;]+);base64,/);
  return match?.[1] ?? null;
}

/**
 * Estimate base64 size in bytes
 */
export function estimateBase64Size(base64: string): number {
  // Base64 encoding increases size by ~33%
  // Each character is 1 byte
  return base64.length;
}

/**
 * Estimate decoded size from base64
 */
export function estimateDecodedSize(base64: string): number {
  // Remove padding characters
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Chunk base64 string for processing
 */
export function chunkBase64(base64: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.substring(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Validate base64 string
 */
export function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

/**
 * Remove base64 padding
 */
export function removeBase64Padding(base64: string): string {
  return base64.replace(/=+$/, '');
}

/**
 * Add base64 padding
 */
export function addBase64Padding(base64: string): string {
  const padding = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padding);
}

/**
 * Compress base64 (simplified)
 */
export function compressBase64(base64: string): string {
  // Remove whitespace and unnecessary padding
  return base64.replace(/\s/g, '').replace(/=+$/, '');
}