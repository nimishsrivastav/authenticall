/**
 * Shared Types Index
 * Re-exports all types for easy importing
 */

// Chrome message types
export * from './chrome-messages';

// Extension state types
export * from './extension-state';

// Additional type exports for convenience
export type { MessageResponse } from './chrome-messages';
export type {
  Platform,
  TrustLevel,
  AlertSeverity,
  AlertCategory,
} from './extension-state';