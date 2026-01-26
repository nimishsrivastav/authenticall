/**
 * ComponentBreakdown Component
 * Shows breakdown of trust score by component (visual, behavioral, audio)
 */

import React from 'react';

interface ComponentBreakdownProps {
  visual: number;
  behavioral: number;
  audio: number;
  showLabels?: boolean;
}

interface ScoreBarProps {
  label: string;
  score: number;
  icon: React.ReactNode;
}

function ScoreBar({ label, score, icon }: ScoreBarProps) {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const getBarColor = (s: number) => {
    if (s >= 85) return 'bg-green-500';
    if (s >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {Math.round(normalizedScore)}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(normalizedScore)} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${normalizedScore}%` }}
        />
      </div>
    </div>
  );
}

// Simple SVG icons
const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

export function ComponentBreakdown({
  visual,
  behavioral,
  audio,
  showLabels = true,
}: ComponentBreakdownProps) {
  return (
    <div className="space-y-3">
      {showLabels && (
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Component Scores
        </h3>
      )}
      <div className="space-y-3">
        <ScoreBar
          label="Visual"
          score={visual}
          icon={<EyeIcon />}
        />
        <ScoreBar
          label="Behavioral"
          score={behavioral}
          icon={<ChatIcon />}
        />
        <ScoreBar
          label="Audio"
          score={audio}
          icon={<MicIcon />}
        />
      </div>
    </div>
  );
}
