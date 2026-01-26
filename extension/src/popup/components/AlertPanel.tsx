/**
 * AlertPanel Component
 * Panel displaying active alerts with filtering
 */

import { useState, useMemo } from 'react';
import { AlertCard } from './AlertCard';
import type { Alert, AlertSeverity } from '../../shared/types/extension-state';

interface AlertPanelProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  maxDisplay?: number;
}

type FilterType = 'all' | AlertSeverity;

export function AlertPanel({
  alerts,
  onDismiss,
  onClearAll,
  maxDisplay = 10,
}: AlertPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showDismissed, setShowDismissed] = useState(false);

  const filteredAlerts = useMemo(() => {
    let result = alerts;

    // Filter by dismissed status
    if (!showDismissed) {
      result = result.filter((a) => !a.dismissed);
    }

    // Filter by severity
    if (filter !== 'all') {
      result = result.filter((a) => a.severity === filter);
    }

    // Limit display count
    return result.slice(0, maxDisplay);
  }, [alerts, filter, showDismissed, maxDisplay]);

  const severityCounts = useMemo(() => {
    const counts: { all: number; critical: number; high: number; medium: number; low: number } = { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => {
      if (!a.dismissed) {
        counts.all++;
        counts[a.severity] = (counts[a.severity] || 0) + 1;
      }
    });
    return counts;
  }, [alerts]);

  const activeAlertCount = alerts.filter((a) => !a.dismissed).length;

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alerts
          </h2>
          {activeAlertCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
              {activeAlertCount}
            </span>
          )}
        </div>
        {activeAlertCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'critical', 'high', 'medium', 'low'] as FilterType[]).map((severity) => {
          const count = severityCounts[severity] || 0;
          const isActive = filter === severity;
          return (
            <button
              key={severity}
              onClick={() => setFilter(severity)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                transition-colors whitespace-nowrap
                ${isActive
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
              {count > 0 && (
                <span className={`
                  ml-1 px-1.5 py-0.5 rounded-full text-xs
                  ${isActive
                    ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={onDismiss}
            />
          ))
        ) : (
          <div className="py-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all' ? 'No alerts' : `No ${filter} alerts`}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {activeAlertCount === 0
                ? 'Everything looks good!'
                : 'Try a different filter'}
            </p>
          </div>
        )}
      </div>

      {/* Show dismissed toggle */}
      {alerts.some((a) => a.dismissed) && (
        <button
          onClick={() => setShowDismissed(!showDismissed)}
          className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {showDismissed ? 'Hide dismissed alerts' : 'Show dismissed alerts'}
        </button>
      )}
    </div>
  );
}
