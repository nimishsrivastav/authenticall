/**
 * useSettings Hook
 * Manages settings persistence with Chrome storage
 */

import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../store';
import { MessageType } from '../../shared/types/chrome-messages';
import type { ExtensionSettings } from '../../shared/types/extension-state';
import { STORAGE_KEYS } from '../../shared/types/extension-state';

export function useSettings() {
  // Select state and actions separately - actions are stable references
  const settings = useSettingsStore((state) => state.settings);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const hasUnsavedChanges = useSettingsStore((state) => state.hasUnsavedChanges);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const setLoading = useSettingsStore((state) => state.setLoading);
  const setSaving = useSettingsStore((state) => state.setSaving);
  const setHasUnsavedChanges = useSettingsStore((state) => state.setHasUnsavedChanges);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const updateThreshold = useSettingsStore((state) => state.updateThreshold);
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  // Load settings from Chrome storage
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      if (result[STORAGE_KEYS.SETTINGS]) {
        setSettings(result[STORAGE_KEYS.SETTINGS] as ExtensionSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setSettings]);

  // Save settings to Chrome storage
  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      // Get current settings from store
      const currentSettings = useSettingsStore.getState().settings;
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: currentSettings,
      });

      // Notify background of settings update
      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_SETTINGS,
        timestamp: Date.now(),
        settings: currentSettings,
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [setSaving, setHasUnsavedChanges]);

  // Validate API key
  const validateApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    try {
      // Simple validation - key should exist and have reasonable length
      if (!apiKey || apiKey.length < 20) {
        return false;
      }
      // Could add actual API validation here in the future
      return true;
    } catch {
      return false;
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    updateSetting,
    updateThreshold,
    resetToDefaults,
    loadSettings,
    saveSettings,
    validateApiKey,
  };
}
