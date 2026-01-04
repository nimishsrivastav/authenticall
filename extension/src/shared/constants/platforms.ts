/**
 * Platform Detection Constants
 * Defines platform-specific selectors and patterns
 */

import { Platform } from '../types';

/**
 * Platform detection patterns
 */
export const PLATFORM_PATTERNS: Record<Platform, RegExp> = {
  'google-meet': /meet\.google\.com/i,
  'zoom': /zoom\.us/i,
  'teams': /teams\.microsoft\.com/i,
  'unknown': /.*/,
};

/**
 * Platform names for display
 */
export const PLATFORM_NAMES: Record<Platform, string> = {
  'google-meet': 'Google Meet',
  'zoom': 'Zoom',
  'teams': 'Microsoft Teams',
  'unknown': 'Unknown Platform',
};

/**
 * Video element selectors for each platform
 */
export const VIDEO_SELECTORS: Record<Platform, string[]> = {
  'google-meet': [
    'video[class*="participant"]',
    'video[autoplay]',
    'div[data-participant-id] video',
  ],
  'zoom': [
    'video[class*="video-player"]',
    'video[class*="participant-video"]',
    'video.video-canvas',
  ],
  'teams': [
    'video[class*="video-stream"]',
    'video[data-tid="video-player"]',
    'div[class*="calling-video"] video',
  ],
  'unknown': ['video'],
};

/**
 * Transcript/caption selectors for each platform
 */
export const TRANSCRIPT_SELECTORS: Record<Platform, string[]> = {
  'google-meet': [
    'div[class*="caption"]',
    'div[jsname="tgaKEf"]', // Google Meet captions container
    'span[class*="caption-text"]',
  ],
  'zoom': [
    'div[class*="caption"]',
    'div[class*="subtitle"]',
    'span[class*="closed-caption"]',
  ],
  'teams': [
    'div[class*="caption"]',
    'div[data-tid="closed-captions"]',
    'span[class*="captions-text"]',
  ],
  'unknown': ['[class*="caption"]', '[class*="subtitle"]'],
};

/**
 * Participant count selectors
 */
export const PARTICIPANT_SELECTORS: Record<Platform, string[]> = {
  'google-meet': [
    'div[data-participant-id]',
    'div[class*="participant"]',
  ],
  'zoom': [
    'div[class*="video-list-item"]',
    'div[aria-label*="participant"]',
  ],
  'teams': [
    'div[class*="participant"]',
    'div[data-tid="roster-item"]',
  ],
  'unknown': ['div[class*="participant"]'],
};

/**
 * Meeting control selectors (to detect meeting state)
 */
export const CONTROL_SELECTORS: Record<Platform, { leave: string[]; mute: string[] }> = {
  'google-meet': {
    leave: ['button[aria-label*="Leave"]', 'button[data-tooltip*="Leave"]'],
    mute: ['button[aria-label*="microphone"]', 'button[data-is-muted]'],
  },
  'zoom': {
    leave: ['button[aria-label*="Leave"]', 'button.leave-btn'],
    mute: ['button[aria-label*="Mute"]', 'button.audio-btn'],
  },
  'teams': {
    leave: ['button[data-tid*="call-hangup"]', 'button[aria-label*="Leave"]'],
    mute: ['button[data-tid*="microphone"]', 'button[aria-label*="Mute"]'],
  },
  'unknown': {
    leave: ['button[aria-label*="Leave"]'],
    mute: ['button[aria-label*="Mute"]'],
  },
};

/**
 * Platform feature support
 */
export interface PlatformFeatures {
  videoCaptureSupported: boolean;
  audioCaptureSupported: boolean;
  transcriptSupported: boolean;
  participantDetectionSupported: boolean;
}

export const PLATFORM_FEATURES: Record<Platform, PlatformFeatures> = {
  'google-meet': {
    videoCaptureSupported: true,
    audioCaptureSupported: true,
    transcriptSupported: true,
    participantDetectionSupported: true,
  },
  'zoom': {
    videoCaptureSupported: true,
    audioCaptureSupported: true,
    transcriptSupported: true,
    participantDetectionSupported: true,
  },
  'teams': {
    videoCaptureSupported: true,
    audioCaptureSupported: true,
    transcriptSupported: false, // More complex in Teams
    participantDetectionSupported: true,
  },
  'unknown': {
    videoCaptureSupported: false,
    audioCaptureSupported: false,
    transcriptSupported: false,
    participantDetectionSupported: false,
  },
};

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): Platform {
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      return platform as Platform;
    }
  }
  return 'unknown';
}

/**
 * Get platform name
 */
export function getPlatformName(platform: Platform): string {
  return PLATFORM_NAMES[platform] || 'Unknown';
}

/**
 * Check if platform supports feature
 */
export function isPlatformFeatureSupported(
  platform: Platform,
  feature: keyof PlatformFeatures,
): boolean {
  return PLATFORM_FEATURES[platform]?.[feature] ?? false;
}