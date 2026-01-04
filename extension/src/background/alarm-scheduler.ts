/**
 * Alarm Scheduler
 * Manages periodic tasks using Chrome Alarms API
 */

import { ALARM_NAMES, ALARM_INTERVALS } from '../shared/constants';
import { STORAGE_KEYS, ExtensionSettings } from '../shared/types';

export class AlarmScheduler {
  /**
   * Initialize alarm scheduler
   */
  public initialize(): void {
    // Set up alarm listeners
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    // Create recurring alarms
    this.createAlarms();

    console.log('[AlarmScheduler] Initialized');
  }

  /**
   * Create recurring alarms
   */
  private createAlarms(): void {
    // Cache cleanup alarm
    chrome.alarms.create(ALARM_NAMES.CLEANUP_CACHE, {
      periodInMinutes: ALARM_INTERVALS.CLEANUP_CACHE,
    });

    // Statistics sync alarm
    chrome.alarms.create(ALARM_NAMES.SYNC_STATISTICS, {
      periodInMinutes: ALARM_INTERVALS.SYNC_STATISTICS,
    });

    // API key check alarm
    chrome.alarms.create(ALARM_NAMES.CHECK_API_KEY, {
      periodInMinutes: ALARM_INTERVALS.CHECK_API_KEY,
    });

    console.log('[AlarmScheduler] Alarms created');
  }

  /**
   * Handle alarm events
   */
  private handleAlarm(alarm: chrome.alarms.Alarm): void {
    console.log('[AlarmScheduler] Alarm triggered:', alarm.name);

    switch (alarm.name) {
      case ALARM_NAMES.CLEANUP_CACHE:
        this.cleanupCache();
        break;

      case ALARM_NAMES.SYNC_STATISTICS:
        this.syncStatistics();
        break;

      case ALARM_NAMES.CHECK_API_KEY:
        this.checkApiKey();
        break;

      default:
        console.warn('[AlarmScheduler] Unknown alarm:', alarm.name);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupCache(): Promise<void> {
    console.log('[AlarmScheduler] Cleaning up cache...');

    try {
      const result = await chrome.storage.local.get('vibecheck_cache');
      const cache: Record<string, any> = result.vibecheck_cache || {};
      const now = Date.now();
      let cleanedCount = 0;

      // Remove expired entries
      for (const key in cache) {
        if (cache[key].expiry && cache[key].expiry < now) {
          delete cache[key];
          cleanedCount++;
        }
      }

      // Save cleaned cache
      if (cleanedCount > 0) {
        await chrome.storage.local.set({ vibecheck_cache: cache });
        console.log(`[AlarmScheduler] Cleaned ${cleanedCount} cache entries`);
      }
    } catch (error) {
      console.error('[AlarmScheduler] Failed to cleanup cache:', error);
    }
  }

  /**
   * Sync statistics to storage
   */
  private async syncStatistics(): Promise<void> {
    console.log('[AlarmScheduler] Syncing statistics...');

    try {
      // This will be implemented in Phase 5 when we have actual statistics
      // For now, just log
      console.log('[AlarmScheduler] Statistics sync not yet implemented');
    } catch (error) {
      console.error('[AlarmScheduler] Failed to sync statistics:', error);
    }
  }

  /**
   * Check if API key is still valid
   */
  private async checkApiKey(): Promise<void> {
    console.log('[AlarmScheduler] Checking API key...');

    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      const settings = result[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings> | undefined;

      if (!settings || !settings.apiKey) {
        console.warn('[AlarmScheduler] No API key configured');
        
        // Show notification to remind user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'VibeCheck AI',
          message: 'Please configure your Gemini API key in settings',
          priority: 1,
        });
      }
    } catch (error) {
      console.error('[AlarmScheduler] Failed to check API key:', error);
    }
  }

  /**
   * Cancel all alarms
   */
  public async cancelAll(): Promise<void> {
    try {
      await chrome.alarms.clearAll();
      console.log('[AlarmScheduler] All alarms cancelled');
    } catch (error) {
      console.error('[AlarmScheduler] Failed to cancel alarms:', error);
    }
  }
}