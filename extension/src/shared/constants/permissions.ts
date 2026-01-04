/**
 * Extension Permissions and API Configuration
 */

/**
 * Required Chrome permissions
 */
export const REQUIRED_PERMISSIONS = [
  'storage',
  'alarms',
  'notifications',
  'activeTab',
] as const;

/**
 * Optional Chrome permissions
 */
export const OPTIONAL_PERMISSIONS = ['tabCapture'] as const;

/**
 * Host permissions for video conferencing platforms
 */
export const HOST_PERMISSIONS = [
  'https://meet.google.com/*',
  'https://*.zoom.us/*',
  'https://teams.microsoft.com/*',
] as const;

/**
 * Gemini API configuration
 */
export const GEMINI_API = {
  BASE_URL: 'https://generativelanguage.googleapis.com',
  VERSION: 'v1beta',
  ENDPOINTS: {
    GENERATE_CONTENT: 'models/{model}:generateContent',
    STREAM_CONTENT: 'models/{model}:streamGenerateContent',
  },
  MODELS: {
    FLASH: 'gemini-3-flash',
    PRO: 'gemini-3-pro',
  },
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 60,
  REQUESTS_PER_HOUR: 1500,
  CONCURRENT_REQUESTS: 3,
  BACKOFF_MULTIPLIER: 2,
  MAX_BACKOFF: 60000, // 60 seconds
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  DURATION: 3600000, // 1 hour in milliseconds
  MAX_SIZE: 100, // Maximum number of cached items
  CLEANUP_INTERVAL: 300000, // 5 minutes
} as const;

/**
 * Storage quota limits
 */
export const STORAGE_LIMITS = {
  LOCAL: {
    MAX_ITEMS: 512,
    QUOTA_BYTES: 10485760, // 10MB for local storage
  },
  SYNC: {
    MAX_ITEMS: 512,
    QUOTA_BYTES: 102400, // 100KB for sync storage
    MAX_ITEM_SIZE: 8192, // 8KB per item
  },
} as const;

/**
 * Alarm names for scheduled tasks
 */
export const ALARM_NAMES = {
  CLEANUP_CACHE: 'cleanup-cache',
  SYNC_STATISTICS: 'sync-statistics',
  CHECK_API_KEY: 'check-api-key',
} as const;

/**
 * Alarm intervals (in minutes)
 */
export const ALARM_INTERVALS = {
  CLEANUP_CACHE: 5,
  SYNC_STATISTICS: 30,
  CHECK_API_KEY: 60,
} as const;

/**
 * Notification configuration
 */
export const NOTIFICATION_CONFIG = {
  TYPES: {
    ALERT: 'alert',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
  },
  PRIORITY: {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
  },
  DEFAULT_ICON: 'icons/icon128.png',
  SOUND: {
    ALERT: 'alert.mp3',
    WARNING: 'warning.mp3',
  },
} as const;

/**
 * Chrome extension URLs
 */
export const EXTENSION_URLS = {
  OPTIONS: 'options.html',
  POPUP: 'popup.html',
  PRIVACY_POLICY: 'https://vibecheck.ai/privacy',
  SUPPORT: 'https://vibecheck.ai/support',
  GITHUB: 'https://github.com/yourusername/vibecheck-ai',
} as const;

/**
 * Error codes
 */
export enum ErrorCode {
  // API errors
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  
  // Capture errors
  CAPTURE_NOT_SUPPORTED = 'CAPTURE_NOT_SUPPORTED',
  CAPTURE_PERMISSION_DENIED = 'CAPTURE_PERMISSION_DENIED',
  CAPTURE_STREAM_ERROR = 'CAPTURE_STREAM_ERROR',
  
  // Platform errors
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
  PLATFORM_DETECTION_FAILED = 'PLATFORM_DETECTION_FAILED',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_READ_ERROR = 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR = 'STORAGE_WRITE_ERROR',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
}

/**
 * Error messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.API_KEY_MISSING]: 'Gemini API key is missing. Please add it in settings.',
  [ErrorCode.API_KEY_INVALID]: 'Gemini API key is invalid. Please check your settings.',
  [ErrorCode.API_REQUEST_FAILED]: 'Failed to connect to Gemini API. Please try again.',
  [ErrorCode.API_RATE_LIMITED]: 'API rate limit exceeded. Please wait and try again.',
  [ErrorCode.API_QUOTA_EXCEEDED]: 'API quota exceeded. Please check your Gemini account.',
  [ErrorCode.CAPTURE_NOT_SUPPORTED]: 'Video/audio capture is not supported on this platform.',
  [ErrorCode.CAPTURE_PERMISSION_DENIED]: 'Permission denied for video/audio capture.',
  [ErrorCode.CAPTURE_STREAM_ERROR]: 'Error capturing video/audio stream.',
  [ErrorCode.PLATFORM_NOT_SUPPORTED]: 'This video conferencing platform is not supported.',
  [ErrorCode.PLATFORM_DETECTION_FAILED]: 'Failed to detect video conferencing platform.',
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded. Please clear some data.',
  [ErrorCode.STORAGE_READ_ERROR]: 'Failed to read data from storage.',
  [ErrorCode.STORAGE_WRITE_ERROR]: 'Failed to write data to storage.',
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred.',
  [ErrorCode.INITIALIZATION_FAILED]: 'Extension initialization failed.',
};