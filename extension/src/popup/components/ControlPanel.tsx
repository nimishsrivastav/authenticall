/**
 * ControlPanel Component
 * Main control panel with start/stop button and status
 */

import { StatusIndicator } from './StatusIndicator';
import { StartStopButton } from './StartStopButton';
import type { MonitoringState, SessionInfo } from '../../shared/types/extension-state';

interface ControlPanelProps {
  state: MonitoringState;
  session: SessionInfo | null;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function ControlPanel({
  state,
  session,
  error,
  onStart,
  onStop,
}: ControlPanelProps) {
  const sessionDuration = session
    ? Date.now() - session.startTime
    : 0;

  return (
    <div className="card p-4 space-y-4">
      {/* Status */}
      <StatusIndicator
        state={state}
        error={error}
        {...(session?.platform && { platform: session.platform })}
      />

      {/* Session Info */}
      {session && state === 'ACTIVE' && (
        <div className="flex items-center justify-between px-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDuration(sessionDuration)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{session.participantCount} participant{session.participantCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Control Button */}
      <StartStopButton
        state={state}
        onStart={onStart}
        onStop={onStop}
      />
    </div>
  );
}
