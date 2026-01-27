/**
 * Settings Store
 * User settings management using Zustand
 */

import { create } from 'zustand';
import type { ExtensionSettings } from '../../shared/types/extension-state';

export interface SettingsStore {
  settings: ExtensionSettings;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;

  // Actions
  setSettings: (settings: ExtensionSettings) => void;
  updateSetting: <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ) => void;
  updateThreshold: (key: 'safe' | 'caution' | 'danger', value: number) => void;
  updateCaptureSettings: (
    key: keyof ExtensionSettings['captureSettings'],
    value: number
  ) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  geminiModel: 'gemini-3-flash-preview',
  enableNotifications: true,
  notificationSound: true,
  trustThresholds: {
    safe: 85,
    caution: 50,
    danger: 0,
  },
  captureSettings: {
    videoFps: 1,
    audioDuration: 5000,
    maxConcurrentRequests: 3,
  },
  enableTelemetry: false,
  enableDebugMode: false,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,

  setSettings: (settings) =>
    set({ settings, hasUnsavedChanges: false }),

  updateSetting: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value },
      hasUnsavedChanges: true,
    })),

  updateThreshold: (key, value) =>
    set((state) => ({
      settings: {
        ...state.settings,
        trustThresholds: {
          ...state.settings.trustThresholds,
          [key]: value,
        },
      },
      hasUnsavedChanges: true,
    })),

  updateCaptureSettings: (key, value) =>
    set((state) => ({
      settings: {
        ...state.settings,
        captureSettings: {
          ...state.settings.captureSettings,
          [key]: value,
        },
      },
      hasUnsavedChanges: true,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setSaving: (saving) => set({ isSaving: saving }),

  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  resetToDefaults: () =>
    set({
      settings: DEFAULT_SETTINGS,
      hasUnsavedChanges: true,
    }),
}));
