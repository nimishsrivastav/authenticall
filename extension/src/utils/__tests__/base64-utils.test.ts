/**
 * Base64 Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  encodeBase64,
  decodeBase64,
  uint8ArrayToBase64,
  base64ToUint8Array,
  float32ArrayToBase64,
  base64ToFloat32Array,
  getDataURL,
  extractBase64FromDataURL,
  getMimeTypeFromDataURL,
  estimateBase64Size,
  estimateDecodedSize,
  chunkBase64,
  isValidBase64,
  removeBase64Padding,
  addBase64Padding,
  compressBase64,
} from '../base64-utils';

describe('Base64 Utilities', () => {
  describe('encodeBase64', () => {
    it('should encode string to base64', () => {
      expect(encodeBase64('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('should encode empty string', () => {
      expect(encodeBase64('')).toBe('');
    });

    it('should handle special characters', () => {
      const encoded = encodeBase64('Special: äöü');
      expect(typeof encoded).toBe('string');
    });
  });

  describe('decodeBase64', () => {
    it('should decode base64 to string', () => {
      expect(decodeBase64('SGVsbG8sIFdvcmxkIQ==')).toBe('Hello, World!');
    });

    it('should decode empty base64', () => {
      expect(decodeBase64('')).toBe('');
    });

    it('should be inverse of encodeBase64', () => {
      const original = 'Test string 123';
      expect(decodeBase64(encodeBase64(original))).toBe(original);
    });
  });

  describe('uint8ArrayToBase64', () => {
    it('should convert Uint8Array to base64', () => {
      const array = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      expect(uint8ArrayToBase64(array)).toBe('SGVsbG8=');
    });

    it('should handle empty array', () => {
      const array = new Uint8Array([]);
      expect(uint8ArrayToBase64(array)).toBe('');
    });

    it('should handle binary data', () => {
      const array = new Uint8Array([0, 255, 128, 64, 32]);
      const base64 = uint8ArrayToBase64(array);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });
  });

  describe('base64ToUint8Array', () => {
    it('should convert base64 to Uint8Array', () => {
      const array = base64ToUint8Array('SGVsbG8=');
      expect(array).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle empty base64', () => {
      const array = base64ToUint8Array('');
      expect(array.length).toBe(0);
    });

    it('should be inverse of uint8ArrayToBase64', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const roundTrip = base64ToUint8Array(uint8ArrayToBase64(original));
      expect(roundTrip).toEqual(original);
    });
  });

  describe('float32ArrayToBase64', () => {
    it('should convert Float32Array to base64', () => {
      const array = new Float32Array([1.0, 2.0, 3.0]);
      const base64 = float32ArrayToBase64(array);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const array = new Float32Array([]);
      const base64 = float32ArrayToBase64(array);
      expect(base64).toBe('');
    });
  });

  describe('base64ToFloat32Array', () => {
    it('should be inverse of float32ArrayToBase64', () => {
      const original = new Float32Array([1.5, -2.5, 3.14159]);
      const base64 = float32ArrayToBase64(original);
      const roundTrip = base64ToFloat32Array(base64);

      expect(roundTrip.length).toBe(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(roundTrip[i]).toBeCloseTo(original[i]!, 5);
      }
    });
  });

  describe('getDataURL', () => {
    it('should create data URL with default mime type', () => {
      const dataURL = getDataURL('SGVsbG8=');
      expect(dataURL).toBe('data:image/jpeg;base64,SGVsbG8=');
    });

    it('should create data URL with custom mime type', () => {
      const dataURL = getDataURL('SGVsbG8=', 'image/png');
      expect(dataURL).toBe('data:image/png;base64,SGVsbG8=');
    });

    it('should create data URL for audio', () => {
      const dataURL = getDataURL('SGVsbG8=', 'audio/wav');
      expect(dataURL).toBe('data:audio/wav;base64,SGVsbG8=');
    });
  });

  describe('extractBase64FromDataURL', () => {
    it('should extract base64 from data URL', () => {
      const base64 = extractBase64FromDataURL('data:image/jpeg;base64,SGVsbG8=');
      expect(base64).toBe('SGVsbG8=');
    });

    it('should handle different mime types', () => {
      const base64 = extractBase64FromDataURL('data:application/pdf;base64,QUJD');
      expect(base64).toBe('QUJD');
    });

    it('should return empty string for invalid data URL', () => {
      const base64 = extractBase64FromDataURL('not-a-data-url');
      expect(base64).toBe('');
    });

    it('should be inverse of getDataURL', () => {
      const original = 'SGVsbG8gV29ybGQ=';
      const dataURL = getDataURL(original);
      const extracted = extractBase64FromDataURL(dataURL);
      expect(extracted).toBe(original);
    });
  });

  describe('getMimeTypeFromDataURL', () => {
    it('should extract mime type', () => {
      const mimeType = getMimeTypeFromDataURL('data:image/png;base64,ABC');
      expect(mimeType).toBe('image/png');
    });

    it('should handle various mime types', () => {
      expect(getMimeTypeFromDataURL('data:image/jpeg;base64,ABC')).toBe('image/jpeg');
      expect(getMimeTypeFromDataURL('data:audio/wav;base64,ABC')).toBe('audio/wav');
      expect(getMimeTypeFromDataURL('data:application/json;base64,ABC')).toBe('application/json');
    });

    it('should return null for invalid data URL', () => {
      const mimeType = getMimeTypeFromDataURL('not-a-data-url');
      expect(mimeType).toBeNull();
    });
  });

  describe('estimateBase64Size', () => {
    it('should return character count', () => {
      expect(estimateBase64Size('SGVsbG8=')).toBe(8);
    });

    it('should return 0 for empty string', () => {
      expect(estimateBase64Size('')).toBe(0);
    });
  });

  describe('estimateDecodedSize', () => {
    it('should estimate decoded size without padding', () => {
      const base64 = 'SGVsbG8='; // "Hello" (5 bytes)
      // 8 chars * 3/4 - 1 padding = 5 bytes
      expect(estimateDecodedSize(base64)).toBe(5);
    });

    it('should handle no padding', () => {
      const base64 = 'QUJD'; // "ABC" (3 bytes)
      expect(estimateDecodedSize(base64)).toBe(3);
    });

    it('should handle double padding', () => {
      const base64 = 'QUI='; // "AB" (2 bytes)
      // 4 chars * 3/4 - 1 padding = 2 bytes
      expect(estimateDecodedSize(base64)).toBe(2);
    });
  });

  describe('chunkBase64', () => {
    it('should split base64 into chunks', () => {
      const base64 = 'ABCDEFGHIJKLMNOP';
      const chunks = chunkBase64(base64, 4);

      expect(chunks).toEqual(['ABCD', 'EFGH', 'IJKL', 'MNOP']);
    });

    it('should handle uneven splits', () => {
      const base64 = 'ABCDEFG';
      const chunks = chunkBase64(base64, 3);

      expect(chunks).toEqual(['ABC', 'DEF', 'G']);
    });

    it('should return single chunk for small strings', () => {
      const base64 = 'ABC';
      const chunks = chunkBase64(base64, 10);

      expect(chunks).toEqual(['ABC']);
    });

    it('should handle empty string', () => {
      const chunks = chunkBase64('', 4);
      expect(chunks).toEqual([]);
    });
  });

  describe('isValidBase64', () => {
    it('should return true for valid base64', () => {
      expect(isValidBase64('SGVsbG8=')).toBe(true);
      expect(isValidBase64('QUJD')).toBe(true);
    });

    it('should return false for invalid base64', () => {
      expect(isValidBase64('Invalid!@#$')).toBe(false);
      expect(isValidBase64('SGVsbG8')).toBe(false); // Missing padding
    });

    it('should return true for empty string', () => {
      expect(isValidBase64('')).toBe(true);
    });
  });

  describe('removeBase64Padding', () => {
    it('should remove padding', () => {
      expect(removeBase64Padding('SGVsbG8=')).toBe('SGVsbG8');
      expect(removeBase64Padding('QUI==')).toBe('QUI');
    });

    it('should handle no padding', () => {
      expect(removeBase64Padding('QUJD')).toBe('QUJD');
    });
  });

  describe('addBase64Padding', () => {
    it('should add correct padding', () => {
      expect(addBase64Padding('SGVsbG8')).toBe('SGVsbG8=');
      expect(addBase64Padding('QUI')).toBe('QUI=');
    });

    it('should handle already padded', () => {
      expect(addBase64Padding('QUJD')).toBe('QUJD');
    });

    it('should handle strings needing double padding', () => {
      expect(addBase64Padding('QU')).toBe('QU==');
    });
  });

  describe('compressBase64', () => {
    it('should remove whitespace', () => {
      expect(compressBase64('SGVs bG8=')).toBe('SGVsbG8');
    });

    it('should remove padding', () => {
      expect(compressBase64('SGVsbG8=')).toBe('SGVsbG8');
    });

    it('should remove both whitespace and padding', () => {
      expect(compressBase64('SGVs\nbG8==')).toBe('SGVsbG8');
    });
  });

  describe('round-trip conversions', () => {
    it('should preserve text through encode/decode', () => {
      const texts = ['Hello', 'Test 123', 'Special: äöü', ''];
      for (const text of texts) {
        expect(decodeBase64(encodeBase64(text))).toBe(text);
      }
    });

    it('should preserve binary through Uint8Array conversion', () => {
      const arrays = [
        new Uint8Array([0, 1, 2, 3, 4, 5]),
        new Uint8Array([255, 128, 64, 32, 16, 8]),
        new Uint8Array([]),
      ];
      for (const arr of arrays) {
        expect(base64ToUint8Array(uint8ArrayToBase64(arr))).toEqual(arr);
      }
    });

    it('should preserve floats through Float32Array conversion', () => {
      const array = new Float32Array([0.5, -1.5, 3.14159, 0]);
      const roundTrip = base64ToFloat32Array(float32ArrayToBase64(array));

      for (let i = 0; i < array.length; i++) {
        expect(roundTrip[i]).toBeCloseTo(array[i]!, 5);
      }
    });
  });
});
