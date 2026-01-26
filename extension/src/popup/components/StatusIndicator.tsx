/**
 * StatusIndicator Component
 * Shows current monitoring status with platform info
 */

import React from 'react';
import type { MonitoringState, Platform } from '../../shared/types/extension-state';

interface StatusIndicatorProps {
  state: MonitoringState;
  platform?: Platform;
  error?: string | null;
}

const PLATFORM_NAMES: Record<Platform, string> = {
  'google-meet': 'Google Meet',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  unknown: 'Unknown Platform',
};

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  'google-meet': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 10.5v3l3.5 2.5V8l-3.5 2.5zM4 18h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2z" />
    </svg>
  ),
  zoom: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4h10c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm12 4l4-2v8l-4-2V8z" />
    </svg>
  ),
  teams: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  ),
  unknown: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STATE_CONFIG = {
  IDLE: {
    label: 'Not Monitoring',
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    dot: 'bg-gray-400',
  },
  INITIALIZING: {
    label: 'Initializing...',
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    dot: 'bg-blue-500 animate-pulse',
  },
  ACTIVE: {
    label: 'Monitoring Active',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    dot: 'bg-green-500 animate-pulse',
  },
  PAUSED: {
    label: 'Paused',
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    dot: 'bg-amber-500',
  },
  ERROR: {
    label: 'Error',
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    dot: 'bg-red-500',
  },
};

export function StatusIndicator({ state, platform, error }: StatusIndicatorProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className={`rounded-lg p-3 ${config.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />

          {/* Status text */}
          <div>
            <p className={`font-medium ${config.color}`}>{config.label}</p>
            {error && state === 'ERROR' && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Platform indicator */}
        {platform && platform !== 'unknown' && state === 'ACTIVE' && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            {PLATFORM_ICONS[platform]}
            <span className="text-sm">{PLATFORM_NAMES[platform]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
