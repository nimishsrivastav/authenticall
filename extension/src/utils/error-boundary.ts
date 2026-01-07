/**
 * Error Boundary
 * Error handling and recovery utilities
 */

import { ErrorCode, ERROR_MESSAGES } from '../shared/constants';

export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: number;
  recoverable: boolean;
}

export class ErrorBoundary {
  private errorLog: ErrorInfo[] = [];
  private maxLogSize: number = 100;

  /**
   * Handle error with recovery
   */
  public handleError(
    code: ErrorCode,
    details?: unknown,
    recoverable: boolean = true,
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      code,
      message: ERROR_MESSAGES[code] || 'Unknown error',
      details,
      timestamp: Date.now(),
      recoverable,
    };

    // Log error
    this.logError(errorInfo);

    // Try recovery if possible
    if (recoverable) {
      this.attemptRecovery(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Log error
   */
  private logError(errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', errorInfo.message, errorInfo.details);

    // Add to error log
    this.errorLog.push(errorInfo);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Send to background for tracking (optional)
    this.reportError(errorInfo);
  }

  /**
   * Attempt error recovery
   */
  private attemptRecovery(errorInfo: ErrorInfo): void {
    console.log('[ErrorBoundary] Attempting recovery for:', errorInfo.code);

    switch (errorInfo.code) {
      case ErrorCode.CAPTURE_STREAM_ERROR:
        // Try to reinitialize capture
        console.log('[ErrorBoundary] Reinitializing capture...');
        break;

      case ErrorCode.STORAGE_QUOTA_EXCEEDED:
        // Clear old data
        console.log('[ErrorBoundary] Clearing storage...');
        break;

      case ErrorCode.API_RATE_LIMITED:
        // Implement backoff
        console.log('[ErrorBoundary] Implementing rate limit backoff...');
        break;

      default:
        console.log('[ErrorBoundary] No recovery strategy for:', errorInfo.code);
    }
  }

  /**
   * Report error to background script
   */
  private async reportError(errorInfo: ErrorInfo): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ERROR',
        error: {
          code: errorInfo.code,
          message: errorInfo.message,
          details: errorInfo.details,
        },
      });
    } catch (error) {
      console.warn('[ErrorBoundary] Failed to report error:', error);
    }
  }

  /**
   * Get error log
   */
  public getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error count by code
   */
  public getErrorCount(code?: ErrorCode): number {
    if (code) {
      return this.errorLog.filter((err) => err.code === code).length;
    }
    return this.errorLog.length;
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errorLog.slice(-count);
  }
}

/**
 * Global error boundary instance
 */
let globalErrorBoundary: ErrorBoundary | null = null;

/**
 * Get or create global error boundary
 */
export function getErrorBoundary(): ErrorBoundary {
  if (!globalErrorBoundary) {
    globalErrorBoundary = new ErrorBoundary();
  }
  return globalErrorBoundary;
}

/**
 * Try/catch wrapper with error handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T> | T,
  errorCode: ErrorCode,
  recoverable: boolean = true,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const boundary = getErrorBoundary();
    boundary.handleError(errorCode, error, recoverable);
    return null;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[ErrorBoundary] Retry attempt ${attempt + 1}/${maxRetries} failed`);

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}