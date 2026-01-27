/**
 * Content Script
 * Injected into video conferencing pages
 * Handles stream capture and platform detection
 */

import { detectPlatform, getPlatformName } from '../shared/constants';
import { MessageType, Platform, DEFAULT_SETTINGS } from '../shared/types';
import { InjectionManager } from './injection-manager';
import { PlatformDetector } from './platform-detector';
import { StreamManager } from '../capture/stream-manager';

/**
 * Content script state
 */
interface ContentScriptState {
  platform: Platform;
  isMonitoring: boolean;
  injectionManager?: InjectionManager;
  platformDetector?: PlatformDetector;
  streamManager?: StreamManager;
}

const state: ContentScriptState = {
  platform: 'unknown',
  isMonitoring: false,
};

/**
 * Initialize content script
 */
function initialize(): void {
  console.log('[ContentScript] Initializing...');

  // Detect platform
  state.platform = detectPlatform(window.location.href);
  console.log('[ContentScript] Platform detected:', getPlatformName(state.platform));

  // Initialize platform detector
  state.platformDetector = new PlatformDetector(state.platform);

  // Initialize injection manager
  state.injectionManager = new InjectionManager(state.platform);

  // Set up message listener
  setupMessageListener();

  // Notify background that content script is ready
  notifyReady();

  console.log('[ContentScript] Initialized');
}

/**
 * Set up message listener
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        console.error('[ContentScript] Error handling message:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    // Return true for async response
    return true;
  });
}

/**
 * Handle messages from background script
 */
async function handleMessage(message: { type: MessageType }): Promise<unknown> {
  console.log('[ContentScript] Received message:', message.type);

  switch (message.type) {
    case MessageType.START_MONITORING:
      return handleStartMonitoring();

    case MessageType.STOP_MONITORING:
      return handleStopMonitoring();

    case MessageType.PING:
      return { success: true, data: { type: MessageType.PONG } };

    default:
      console.warn('[ContentScript] Unknown message type:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Handle start monitoring command
 */
async function handleStartMonitoring(): Promise<{ success: boolean }> {
  console.log('[ContentScript] Starting monitoring...');

  try {
    if (state.isMonitoring) {
      return { success: true }; // Already monitoring
    }

    // Initialize stream manager
    state.streamManager = new StreamManager({
      platform: state.platform,
      videoFps: DEFAULT_SETTINGS.captureSettings.videoFps,
      audioDuration: DEFAULT_SETTINGS.captureSettings.audioDuration,
      maxConcurrentRequests: DEFAULT_SETTINGS.captureSettings.maxConcurrentRequests,
    });

    // Start stream capture
    await state.streamManager.start();

    // Start platform detection and injection
    state.platformDetector?.start();
    state.injectionManager?.start();

    state.isMonitoring = true;

    // Notify background script that monitoring has started
    chrome.runtime.sendMessage({
      type: MessageType.START_MONITORING,
      platform: state.platform,
      url: window.location.href,
      timestamp: Date.now(),
    });

    console.log('[ContentScript] Monitoring started');
    return { success: true };
  } catch (error) {
    console.error('[ContentScript] Failed to start monitoring:', error);
    return { success: false };
  }
}

/**
 * Handle stop monitoring command
 */
async function handleStopMonitoring(): Promise<{ success: boolean }> {
  console.log('[ContentScript] Stopping monitoring...');

  try {
    if (!state.isMonitoring) {
      return { success: true }; // Already stopped
    }

    // Stop stream capture
    await state.streamManager?.stop();

    // Stop platform detection and injection
    state.platformDetector?.stop();
    state.injectionManager?.stop();

    state.isMonitoring = false;

    // Notify background script that monitoring has stopped
    chrome.runtime.sendMessage({
      type: MessageType.STOP_MONITORING,
      timestamp: Date.now(),
    });

    console.log('[ContentScript] Monitoring stopped');
    return { success: true };
  } catch (error) {
    console.error('[ContentScript] Failed to stop monitoring:', error);
    return { success: false };
  }
}

/**
 * Notify background that content script is ready
 */
function notifyReady(): void {
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    platform: state.platform,
    url: window.location.href,
  });
}

/**
 * Clean up on page unload
 */
window.addEventListener('beforeunload', () => {
  console.log('[ContentScript] Page unloading, cleaning up...');
  if (state.isMonitoring) {
    handleStopMonitoring();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Export for testing
export { initialize, handleStartMonitoring, handleStopMonitoring };