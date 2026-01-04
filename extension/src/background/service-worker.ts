/**
 * Background Service Worker
 * Main background script for VibeCheck AI extension
 * Handles message routing, state management, and API orchestration
 */

import { MessageHandler } from './message-handler';
import { AlarmScheduler } from './alarm-scheduler';
import { ExtensionState, MonitoringState, DEFAULT_SETTINGS, DEFAULT_TRUST_SCORE, STORAGE_KEYS, ExtensionSettings } from '../shared/types';

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
 * Message handler instance
 */
let messageHandler: MessageHandler;

/**
 * Alarm scheduler instance
 */
let alarmScheduler: AlarmScheduler;

/**
 * Initialize the extension
 */
async function initialize(): Promise<void> {
  console.log('[VibeCheck AI] Initializing background service worker...');

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

    console.log('[VibeCheck AI] Initialization complete');
  } catch (error) {
    console.error('[VibeCheck AI] Initialization failed:', error);
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
      console.log('[VibeCheck AI] Settings loaded from storage');
    } else {
      // Save default settings
      await saveSettings();
      console.log('[VibeCheck AI] Default settings saved');
    }
  } catch (error) {
    console.error('[VibeCheck AI] Failed to load settings:', error);
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
    console.log('[VibeCheck AI] Settings saved to storage');
  } catch (error) {
    console.error('[VibeCheck AI] Failed to save settings:', error);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners(): void {
  // Handle extension installation or update
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('[VibeCheck AI] Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
      // First time installation
      handleFirstInstall();
    } else if (details.reason === 'update') {
      // Extension updated
      handleUpdate(details.previousVersion);
    }
  });

  // Handle browser startup
  chrome.runtime.onStartup.addListener(() => {
    console.log('[VibeCheck AI] Browser started, reinitializing...');
    initialize();
  });

  // Handle tab updates (detect when user navigates to video conference)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      handleTabUpdate(tabId, tab.url);
    }
  });

  // Handle tab removal (cleanup when tab is closed)
  chrome.tabs.onRemoved.addListener((tabId) => {
    handleTabRemoved(tabId);
  });
}

/**
 * Handle first installation
 */
function handleFirstInstall(): void {
  console.log('[VibeCheck AI] First installation detected');
  
  // Open welcome page or setup wizard (optional)
  // chrome.tabs.create({ url: 'welcome.html' });
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'VibeCheck AI Installed',
    message: 'Welcome! Click the extension icon to get started.',
    priority: 1,
  });
}

/**
 * Handle extension update
 */
function handleUpdate(previousVersion?: string): void {
  console.log('[VibeCheck AI] Updated from version:', previousVersion);
  
  // Perform any necessary migration or cleanup
  // For example, migrate old storage format to new one
}

/**
 * Handle tab URL update
 */
function handleTabUpdate(tabId: number, url: string): void {
  // Check if the URL is a supported video conferencing platform
  const isSupportedPlatform =
    url.includes('meet.google.com') ||
    url.includes('zoom.us') ||
    url.includes('teams.microsoft.com');

  if (isSupportedPlatform) {
    console.log('[VibeCheck AI] Detected video conference platform:', url);
    
    // Update badge to show extension is ready
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId }); // Green
  }
}

/**
 * Handle tab removal
 */
function handleTabRemoved(tabId: number): void {
  console.log('[VibeCheck AI] Tab removed:', tabId);
  
  // Clean up any state associated with this tab
  if (extensionState.monitoring.currentSession) {
    // Stop monitoring if the current session was in this tab
    extensionState.monitoring.state = MonitoringState.IDLE;
    delete extensionState.monitoring.currentSession;
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
  globalThis.vibeCheckState = getExtensionState;
}