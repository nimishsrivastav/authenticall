/**
 * Background Service Worker
 * Main background script for Authenticall AI extension
 * Handles message routing, state management, and API orchestration
 */

import { MessageHandler } from './message-handler';
import { AlarmScheduler } from './alarm-scheduler';
import { AnalysisOrchestrator } from './analysis-orchestrator';
import { 
  ExtensionState, 
  MonitoringState, 
  DEFAULT_SETTINGS, 
  DEFAULT_TRUST_SCORE, 
  STORAGE_KEYS, 
  ExtensionSettings,
  MessageType
} from '../shared/types';

/**
 * Global extension state
 */
let extensionState: ExtensionState = {
  monitoring: {
    state: MonitoringState.IDLE,
    participants: new Map(),
  },
  trustScore: {
    current: DEFAULT_TRUST_SCORE,
    history: [],
  },
  alerts: {
    active: [],
    history: [],
  },
  statistics: {
    sessionsTotal: 0,
    allTime: {
      totalDuration: 0,
      totalFramesAnalyzed: 0,
      totalAlertsTriggered: 0,
    },
  },
  settings: DEFAULT_SETTINGS,
};

/**
 * Component instances
 */
let messageHandler: MessageHandler;
let alarmScheduler: AlarmScheduler;
let analysisOrchestrator: AnalysisOrchestrator | null = null;

/**
 * Initialize the extension
 */
async function initialize(): Promise<void> {
  console.log('[Authenticall] Initializing background service worker...');

  try {
    // Load settings from storage
    await loadSettings();

    // Initialize message handler
    messageHandler = new MessageHandler(extensionState);
    messageHandler.initialize();

    // Initialize alarm scheduler
    alarmScheduler = new AlarmScheduler();
    alarmScheduler.initialize();

    // Set up event listeners
    setupEventListeners();

    console.log('[Authenticall] Initialization complete');
  } catch (error) {
    console.error('[Authenticall] Initialization failed:', error);
  }
}

/**
 * Load settings from Chrome storage
 */
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    if (result[STORAGE_KEYS.SETTINGS]) {
      extensionState.settings = {
        ...DEFAULT_SETTINGS,
        ...(result[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings>),
      };
      console.log('[Authenticall] Settings loaded from storage');
    } else {
      // Save default settings
      await saveSettings();
      console.log('[Authenticall] Default settings saved');
    }
  } catch (error) {
    console.error('[Authenticall] Failed to load settings:', error);
    extensionState.settings = DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to Chrome storage
 */
async function saveSettings(): Promise<void> {
  try {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.SETTINGS]: extensionState.settings,
    });
    console.log('[Authenticall] Settings saved to storage');
  } catch (error) {
    console.error('[Authenticall] Failed to save settings:', error);
  }
}

/**
 * Initialize Analysis Orchestrator (Phase 4)
 */
async function initializeAnalysisOrchestrator(): Promise<void> {
  if (analysisOrchestrator) {
    console.warn('[Authenticall] Analysis orchestrator already initialized');
    return;
  }

  if (!extensionState.settings.apiKey) {
    console.warn('[Authenticall] Cannot initialize analysis orchestrator: No API key');
    return;
  }

  try {
    console.log('[Authenticall] Initializing analysis orchestrator...');
    
    analysisOrchestrator = new AnalysisOrchestrator(extensionState.settings);
    await analysisOrchestrator.initialize();
    analysisOrchestrator.start();
    
    console.log('[Authenticall] Analysis orchestrator initialized and started');
  } catch (error) {
    console.error('[Authenticall] Failed to initialize analysis orchestrator:', error);
    analysisOrchestrator = null;
  }
}

/**
 * Stop Analysis Orchestrator
 */
async function stopAnalysisOrchestrator(): Promise<void> {
  if (analysisOrchestrator) {
    console.log('[Authenticall] Stopping analysis orchestrator...');
    await analysisOrchestrator.stop();
    analysisOrchestrator = null;
    console.log('[Authenticall] Analysis orchestrator stopped');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners(): void {
  // Handle extension installation or update
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Authenticall] Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
      handleFirstInstall();
    } else if (details.reason === 'update') {
      handleUpdate(details.previousVersion);
    }
  });

  // Handle browser startup
  chrome.runtime.onStartup.addListener(() => {
    console.log('[Authenticall] Browser started, reinitializing...');
    initialize();
  });

  // Handle tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      handleTabUpdate(tabId, tab.url);
    }
  });

  // Handle tab removal
  chrome.tabs.onRemoved.addListener((tabId) => {
    handleTabRemoved(tabId);
  });

  // Handle messages (including from content scripts)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleRuntimeMessage(message, sender).then(sendResponse);
    return true; // Async response
  });
}

/**
 * Handle runtime messages (Phase 4 integration)
 */
async function handleRuntimeMessage(
  message: any,
  _sender: chrome.runtime.MessageSender
): Promise<any> {
  // Handle Frame Captured
  if (message.type === MessageType.FRAME_CAPTURED && analysisOrchestrator) {
    await analysisOrchestrator.handleFrameCaptured(message);
    return { success: true };
  }

  // Handle Transcript Captured
  if (message.type === MessageType.TRANSCRIPT_CAPTURED && analysisOrchestrator) {
    await analysisOrchestrator.handleTranscriptCaptured(message);
    return { success: true };
  }

  // Handle Start Monitoring
  if (message.type === MessageType.START_MONITORING) {
    // Initialize orchestrator when monitoring starts
    if (!analysisOrchestrator) {
      await initializeAnalysisOrchestrator();
    }
  }

  // Handle Stop Monitoring
  if (message.type === MessageType.STOP_MONITORING) {
    await stopAnalysisOrchestrator();
  }

  // All other messages handled by default handler
  return { success: true };
}

/**
 * Handle first installation
 */
function handleFirstInstall(): void {
  console.log('[Authenticall] First installation detected');
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Authenticall AI Installed',
    message: 'Welcome! Click the extension icon to get started.',
    priority: 1,
  });
}

/**
 * Handle extension update
 */
function handleUpdate(previousVersion?: string): void {
  console.log('[Authenticall] Updated from version:', previousVersion);
}

/**
 * Handle tab URL update
 */
function handleTabUpdate(tabId: number, url: string): void {
  const isSupportedPlatform =
    url.includes('meet.google.com') ||
    url.includes('zoom.us') ||
    url.includes('teams.microsoft.com');

  if (isSupportedPlatform) {
    console.log('[Authenticall] Detected video conference platform:', url);
    
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
  }
}

/**
 * Handle tab removal
 */
function handleTabRemoved(tabId: number): void {
  console.log('[Authenticall] Tab removed:', tabId);
  
  if (extensionState.monitoring.currentSession) {
    extensionState.monitoring.state = MonitoringState.IDLE;
    delete extensionState.monitoring.currentSession;
    
    // Stop orchestrator when session ends
    stopAnalysisOrchestrator();
  }
}

/**
 * Get extension state (for debugging)
 */
function getExtensionState(): ExtensionState {
  return extensionState;
}

/**
 * Export state for message handler
 */
export function getState(): ExtensionState {
  return extensionState;
}

/**
 * Update state
 */
export function updateState(updates: Partial<ExtensionState>): void {
  extensionState = {
    ...extensionState,
    ...updates,
  };
}

// Initialize on script load
initialize();

// Make state accessible for debugging in development
if (extensionState.settings.enableDebugMode) {
  // @ts-expect-error - Adding to globalThis for debugging
  globalThis.authenticallState = getExtensionState;
  // @ts-expect-error - Adding to globalThis for debugging
  globalThis.authenticallOrchestrator = () => analysisOrchestrator;
}