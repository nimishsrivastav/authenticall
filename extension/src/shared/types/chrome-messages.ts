/**
 * Chrome Extension Message Types
 * Defines all message structures for communication between components
 */

import type { ExtensionSettings } from './extension-state';

/**
 * Message types for different extension components
 */
export enum MessageType {
  // Content Script -> Background
  STREAM_CAPTURE_STARTED = 'STREAM_CAPTURE_STARTED',
  STREAM_CAPTURE_STOPPED = 'STREAM_CAPTURE_STOPPED',
  FRAME_CAPTURED = 'FRAME_CAPTURED',
  AUDIO_CAPTURED = 'AUDIO_CAPTURED',
  TRANSCRIPT_CAPTURED = 'TRANSCRIPT_CAPTURED',
  
  // Background -> Content Script
  START_MONITORING = 'START_MONITORING',
  STOP_MONITORING = 'STOP_MONITORING',
  
  // Background -> Popup
  TRUST_SCORE_UPDATE = 'TRUST_SCORE_UPDATE',
  ALERT_TRIGGERED = 'ALERT_TRIGGERED',
  SESSION_STATS_UPDATE = 'SESSION_STATS_UPDATE',
  
  // Popup -> Background
  GET_CURRENT_STATE = 'GET_CURRENT_STATE',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  REQUEST_ANALYSIS = 'REQUEST_ANALYSIS',
  CLEAR_ALERTS = 'CLEAR_ALERTS',
  
  // Bidirectional
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR',
}

/**
 * Base message structure
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  tabId?: number;
}

/**
 * Stream capture messages
 */
export interface StreamCaptureStartedMessage extends BaseMessage {
  type: MessageType.STREAM_CAPTURE_STARTED;
  platform: 'google-meet' | 'zoom' | 'teams';
  participantCount: number;
}

export interface StreamCaptureStoppedMessage extends BaseMessage {
  type: MessageType.STREAM_CAPTURE_STOPPED;
  reason: 'user' | 'error' | 'meeting-ended';
}

export interface FrameCapturedMessage extends BaseMessage {
  type: MessageType.FRAME_CAPTURED;
  frameData: string; // Base64 encoded image
  width: number;
  height: number;
  participantId?: string;
}

export interface AudioCapturedMessage extends BaseMessage {
  type: MessageType.AUDIO_CAPTURED;
  audioData: string; // Base64 encoded audio
  duration: number;
  sampleRate: number;
}

export interface TranscriptCapturedMessage extends BaseMessage {
  type: MessageType.TRANSCRIPT_CAPTURED;
  text: string;
  speaker?: string;
  confidence?: number;
}

/**
 * Control messages
 */
export interface StartMonitoringMessage extends BaseMessage {
  type: MessageType.START_MONITORING;
}

export interface StopMonitoringMessage extends BaseMessage {
  type: MessageType.STOP_MONITORING;
}

/**
 * Trust score and alert messages
 */
export interface TrustScoreUpdateMessage extends BaseMessage {
  type: MessageType.TRUST_SCORE_UPDATE;
  trustScore: {
    overall: number;
    visual: number;
    audio: number;
    behavioral: number;
    confidence: number;
    level: 'safe' | 'caution' | 'danger' | 'unknown';
  };
}

export interface AlertTriggeredMessage extends BaseMessage {
  type: MessageType.ALERT_TRIGGERED;
  alert: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'visual' | 'audio' | 'behavioral' | 'fusion';
    title: string;
    message: string;
    details?: string;
    actionRequired?: boolean;
  };
}

export interface SessionStatsUpdateMessage extends BaseMessage {
  type: MessageType.SESSION_STATS_UPDATE;
  stats: {
    duration: number;
    framesAnalyzed: number;
    audioChunksAnalyzed: number;
    alertsTriggered: number;
    averageTrustScore: number;
  };
}

/**
 * State and settings messages
 */
export interface GetCurrentStateMessage extends BaseMessage {
  type: MessageType.GET_CURRENT_STATE;
}

export interface UpdateSettingsMessage extends BaseMessage {
  type: MessageType.UPDATE_SETTINGS;
  settings: Partial<ExtensionSettings>;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Union type of all messages
 */
export type ChromeMessage =
  | StreamCaptureStartedMessage
  | StreamCaptureStoppedMessage
  | FrameCapturedMessage
  | AudioCapturedMessage
  | TranscriptCapturedMessage
  | StartMonitoringMessage
  | StopMonitoringMessage
  | TrustScoreUpdateMessage
  | AlertTriggeredMessage
  | SessionStatsUpdateMessage
  | GetCurrentStateMessage
  | UpdateSettingsMessage
  | ErrorMessage
  | BaseMessage;

/**
 * Message response type
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Type guard to check message type
 */
export function isMessageType<T extends ChromeMessage>(
  message: ChromeMessage,
  type: MessageType,
): message is T {
  return message.type === type;
}