/**
 * SessionStats Component
 * Display session statistics and metrics
 */

import React from 'react';
import type { SessionStatistics } from '../../shared/types/extension-state';

interface SessionStatsProps {
  statistics: SessionStatistics;
  isActive: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, subValue, icon, color }: StatCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`${color}`}>{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function SessionStats({ statistics, isActive }: SessionStatsProps) {
  const current = statistics.currentSession;

  return (
    <div className="card p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Session Statistics
      </h2>

      {/* Current Session Stats */}
      {current && isActive ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Duration"
            value={formatDuration(current.duration)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="text-indigo-500"
          />
          <StatCard
            label="Frames Analyzed"
            value={current.framesAnalyzed.toLocaleString()}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="text-blue-500"
          />
          <StatCard
            label="Avg Trust Score"
            value={Math.round(current.averageTrustScore)}
            subValue={`Min: ${Math.round(current.minTrustScore)} / Max: ${Math.round(current.maxTrustScore)}`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            color="text-green-500"
          />
          <StatCard
            label="Alerts"
            value={current.alertsTriggered}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color="text-amber-500"
          />
        </div>
      ) : (
        <div className="text-center py-6">
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">
            No active session
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Start monitoring to see statistics
          </p>
        </div>
      )}

      {/* All-time Stats */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          All-Time Statistics
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Sessions</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {statistics.sessionsTotal}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Duration</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatDuration(statistics.allTime.totalDuration)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Frames Analyzed</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {statistics.allTime.totalFramesAnalyzed.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Alerts</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {statistics.allTime.totalAlertsTriggered}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
