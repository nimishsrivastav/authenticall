/**
 * Message Handler
 * Handles all message passing between extension components
 */

import {
  ChromeMessage,
  MessageType,
  MessageResponse,
  StartMonitoringMessage,
  StopMonitoringMessage,
  FrameCapturedMessage,
  AudioCapturedMessage,
  TranscriptCapturedMessage,
  GetCurrentStateMessage,
  UpdateSettingsMessage,
  ExtensionState,
  MonitoringState,
} from '../shared/types';

export class MessageHandler {
  private state: ExtensionState;

  constructor(state: ExtensionState) {
    this.state = state;
  }

  /**
   * Initialize message listeners
   */
  public initialize(): void {
    chrome.runtime.onMessage.addListener(
      (message: ChromeMessage, sender, sendResponse) => {
        this.handleMessage(message, sender)
          .then(sendResponse)
          .catch((error) => {
            console.error('[MessageHandler] Error handling message:', error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });

        // Return true to indicate async response
        return true;
      },
    );

    console.log('[MessageHandler] Initialized');
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Received message:', message.type, 'from:', sender.tab?.id);

    switch (message.type) {
      case MessageType.START_MONITORING:
        return this.handleStartMonitoring(message as StartMonitoringMessage, sender);

      case MessageType.STOP_MONITORING:
        return this.handleStopMonitoring(message as StopMonitoringMessage);

      case MessageType.FRAME_CAPTURED:
        return this.handleFrameCaptured(message as FrameCapturedMessage);

      case MessageType.AUDIO_CAPTURED:
        return this.handleAudioCaptured(message as AudioCapturedMessage);

      case MessageType.TRANSCRIPT_CAPTURED:
        return this.handleTranscriptCaptured(message as TranscriptCapturedMessage);

      case MessageType.GET_CURRENT_STATE:
        return this.handleGetCurrentState(message as GetCurrentStateMessage);

      case MessageType.UPDATE_SETTINGS:
        return this.handleUpdateSettings(message as UpdateSettingsMessage);

      case MessageType.PING:
        return { success: true, data: { type: MessageType.PONG } };

      default:
        console.warn('[MessageHandler] Unknown message type:', message.type);
        return { success: false, error: 'Unknown message type' };
    }
  }

  /**
   * Handle start monitoring request
   */
  private async handleStartMonitoring(
    _message: StartMonitoringMessage,
    sender: chrome.runtime.MessageSender,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Starting monitoring...');

    try {
      // Validate API key
      if (!this.state.settings.apiKey) {
        return {
          success: false,
          error: 'API key not configured. Please set it in settings.',
        };
      }

      // Update state
      this.state.monitoring.state = MonitoringState.ACTIVE;
      this.state.monitoring.currentSession = {
        id: crypto.randomUUID(),
        platform: 'google-meet', // Will be detected properly in Phase 3
        startTime: Date.now(),
        participantCount: 0,
        url: sender.tab?.url || '',
      };

      // Update badge
      if (sender.tab?.id) {
        chrome.action.setBadgeText({ text: '●', tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: sender.tab.id });
      }

      console.log('[MessageHandler] Monitoring started');

      return {
        success: true,
        data: {
          sessionId: this.state.monitoring.currentSession.id,
        },
      };
    } catch (error) {
      console.error('[MessageHandler] Failed to start monitoring:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start monitoring',
      };
    }
  }

  /**
   * Handle stop monitoring request
   */
  private async handleStopMonitoring(
    _message: StopMonitoringMessage,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Stopping monitoring...');

    try {
      // Update state
      if (this.state.monitoring.currentSession) {
        this.state.monitoring.currentSession.endTime = Date.now();
      }
      this.state.monitoring.state = MonitoringState.IDLE;

      // Clear badge
      chrome.action.setBadgeText({ text: '' });

      console.log('[MessageHandler] Monitoring stopped');

      return { success: true };
    } catch (error) {
      console.error('[MessageHandler] Failed to stop monitoring:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop monitoring',
      };
    }
  }

  /**
   * Handle frame captured
   */
  private async handleFrameCaptured(
    message: FrameCapturedMessage,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Frame captured:', message.width, 'x', message.height);

    try {
      // Update statistics
      if (this.state.statistics.currentSession) {
        this.state.statistics.currentSession.framesAnalyzed++;
      }

      // TODO: Queue frame for analysis (will be implemented in Phase 4)

      return { success: true };
    } catch (error) {
      console.error('[MessageHandler] Failed to handle frame:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle frame',
      };
    }
  }

  /**
   * Handle audio captured
   */
  private async handleAudioCaptured(
    message: AudioCapturedMessage,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Audio captured:', message.duration, 'ms');

    try {
      // Update statistics
      if (this.state.statistics.currentSession) {
        this.state.statistics.currentSession.audioChunksAnalyzed++;
      }

      // TODO: Queue audio for analysis (will be implemented in Phase 4)

      return { success: true };
    } catch (error) {
      console.error('[MessageHandler] Failed to handle audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle audio',
      };
    }
  }

  /**
   * Handle transcript captured
   */
  private async handleTranscriptCaptured(
    message: TranscriptCapturedMessage,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Transcript captured:', message.text);

    try {
      // Update statistics
      if (this.state.statistics.currentSession) {
        this.state.statistics.currentSession.transcriptsProcessed++;
      }

      // TODO: Queue transcript for analysis (will be implemented in Phase 4)

      return { success: true };
    } catch (error) {
      console.error('[MessageHandler] Failed to handle transcript:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle transcript',
      };
    }
  }

  /**
   * Handle get current state request
   */
  private async handleGetCurrentState(
    _message: GetCurrentStateMessage,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Getting current state');

    return {
      success: true,
      data: {
        monitoring: {
          state: this.state.monitoring.state,
          currentSession: this.state.monitoring.currentSession,
        },
        trustScore: this.state.trustScore.current,
        alerts: this.state.alerts.active,
        statistics: this.state.statistics,
        settings: {
          // Don't send API key to popup
          ...this.state.settings,
          apiKey: this.state.settings.apiKey ? '***' : '',
        },
      },
    };
  }

  /**
   * Handle update settings request
   */
  private async handleUpdateSettings(
    message: UpdateSettingsMessage,
  ): Promise<MessageResponse> {
    console.log('[MessageHandler] Updating settings');

    try {
      // Update settings
      this.state.settings = {
        ...this.state.settings,
        ...message.settings,
      };

      // Save to storage
      await chrome.storage.sync.set({
        authenticall_settings: this.state.settings,
      });

      console.log('[MessageHandler] Settings updated');

      return { success: true };
    } catch (error) {
      console.error('[MessageHandler] Failed to update settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      };
    }
  }
}