/**
 * SettingsPanel Component
 * Complete settings interface with tabs
 */

import { useState } from 'react';
import { ApiKeyInput } from './ApiKeyInput';
import { ThresholdControls } from './ThresholdControls';
import type { ExtensionSettings } from '../../shared/types/extension-state';

interface SettingsPanelProps {
  settings: ExtensionSettings;
  onUpdateSetting: <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ) => void;
  onUpdateThreshold: (key: 'safe' | 'caution' | 'danger', value: number) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  onValidateApiKey: (key: string) => Promise<boolean>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

type Tab = 'general' | 'advanced' | 'about';

export function SettingsPanel({
  settings,
  onUpdateSetting,
  onUpdateThreshold,
  onSave,
  onReset,
  onValidateApiKey,
  isSaving,
  hasUnsavedChanges,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaveError(null);
    try {
      await onSave();
    } catch (error) {
      setSaveError('Failed to save settings. Please try again.');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 space-y-6">
        {activeTab === 'general' && (
          <>
            {/* API Key */}
            <ApiKeyInput
              value={settings.apiKey}
              onChange={(value) => onUpdateSetting('apiKey', value)}
              onValidate={onValidateApiKey}
            />

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="label">AI Model</label>
              <select
                value={settings.geminiModel}
                onChange={(e) => onUpdateSetting('geminiModel', e.target.value)}
                className="input"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Recommended)</option>
                <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Flash models are optimized for speed and efficiency
              </p>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <label className="label">Notifications</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => onUpdateSetting('enableNotifications', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable desktop notifications
                  </span>
                </label>
                <label className="flex items-center gap-3 ml-7">
                  <input
                    type="checkbox"
                    checked={settings.notificationSound}
                    onChange={(e) => onUpdateSetting('notificationSound', e.target.checked)}
                    disabled={!settings.enableNotifications}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                  />
                  <span className={`text-sm ${settings.enableNotifications ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                    Play sound for alerts
                  </span>
                </label>
              </div>
            </div>

            {/* Thresholds */}
            <ThresholdControls
              thresholds={settings.trustThresholds}
              onChange={onUpdateThreshold}
              onReset={() => {
                onUpdateThreshold('safe', 85);
                onUpdateThreshold('caution', 50);
                onUpdateThreshold('danger', 0);
              }}
            />
          </>
        )}

        {activeTab === 'advanced' && (
          <>
            {/* Capture Settings */}
            <div className="space-y-4">
              <label className="label">Capture Settings</label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Video FPS
                  </label>
                  <select
                    value={settings.captureSettings.videoFps}
                    onChange={(e) => onUpdateSetting('captureSettings', {
                      ...settings.captureSettings,
                      videoFps: parseInt(e.target.value),
                    })}
                    className="input"
                  >
                    <option value={0.5}>0.5 FPS (Power saver)</option>
                    <option value={1}>1 FPS (Recommended)</option>
                    <option value={2}>2 FPS (High accuracy)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Audio Duration
                  </label>
                  <select
                    value={settings.captureSettings.audioDuration}
                    onChange={(e) => onUpdateSetting('captureSettings', {
                      ...settings.captureSettings,
                      audioDuration: parseInt(e.target.value),
                    })}
                    className="input"
                  >
                    <option value={3000}>3 seconds</option>
                    <option value={5000}>5 seconds (Recommended)</option>
                    <option value={10000}>10 seconds</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Max Concurrent API Requests
                </label>
                <input
                  type="number"
                  value={settings.captureSettings.maxConcurrentRequests}
                  onChange={(e) => onUpdateSetting('captureSettings', {
                    ...settings.captureSettings,
                    maxConcurrentRequests: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)),
                  })}
                  min={1}
                  max={10}
                  className="input w-24"
                />
              </div>
            </div>

            {/* Debug Mode */}
            <div className="space-y-3">
              <label className="label">Developer Options</label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enableDebugMode}
                  onChange={(e) => onUpdateSetting('enableDebugMode', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable debug mode
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enableTelemetry}
                  onChange={(e) => onUpdateSetting('enableTelemetry', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable anonymous usage analytics
                </span>
              </label>
            </div>
          </>
        )}

        {activeTab === 'about' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                VibeCheck AI
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Version 1.0.0
              </p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Real-time deepfake and social engineering detection for video conferences.
              Powered by Google Gemini AI.
            </p>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <a
                href="https://github.com/your-repo/vibecheck-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub Repository
              </a>
              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google AI
              </a>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
              Built for the Gemini 3 Hackathon
            </p>
          </div>
        )}

        {/* Save button */}
        {activeTab !== 'about' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            {saveError && (
              <p className="text-sm text-red-500 dark:text-red-400 mb-3">
                {saveError}
              </p>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={onReset}
                className="btn-secondary"
              >
                Reset All
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="btn-primary disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
