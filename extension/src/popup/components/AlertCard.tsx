/**
 * AlertCard Component
 * Individual alert display with severity and actions
 */

import React, { useState } from 'react';
import type { Alert, AlertSeverity, AlertCategory } from '../../shared/types/extension-state';

interface AlertCardProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { bg: string; border: string; icon: string; badge: string }> = {
  low: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    badge: 'severity-low',
  },
  medium: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500',
    badge: 'severity-medium',
  },
  high: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-500',
    badge: 'severity-high',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    badge: 'severity-critical',
  },
};

const CATEGORY_ICONS: Record<AlertCategory, React.ReactNode> = {
  visual: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  audio: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  behavioral: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  fusion: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function AlertCard({ alert, onDismiss, compact = false }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity];

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-2 rounded-lg ${config.bg} border ${config.border} ${
          alert.dismissed ? 'opacity-50' : ''
        }`}
      >
        <span className={config.icon}>{CATEGORY_ICONS[alert.category]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {alert.title}
          </p>
        </div>
        <span className={`badge ${config.badge}`}>{alert.severity}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-200 ${
        alert.dismissed ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 ${config.icon}`}>
            {CATEGORY_ICONS[alert.category]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {alert.title}
              </h4>
              <span className={`badge ${config.badge}`}>{alert.severity}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {alert.message}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatTimestamp(alert.timestamp)}
            </p>
          </div>
          {onDismiss && !alert.dismissed && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expandable details */}
      {alert.details && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Hide details' : 'Show details'}
          </button>
          {isExpanded && (
            <div className="px-4 pb-4 animate-slide-down">
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {alert.details}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action required indicator */}
      {alert.actionRequired && !alert.dismissed && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800">
          <p className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Action required
          </p>
        </div>
      )}
    </div>
  );
}
