/**
 * ScoreGauge Component
 * Circular gauge displaying trust score with color coding
 */

import { useMemo } from 'react';
import type { TrustLevel } from '../../shared/types/extension-state';

interface ScoreGaugeProps {
  score: number;
  level: TrustLevel;
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const LEVEL_COLORS = {
  safe: {
    stroke: '#10b981',
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    glow: 'glow-green',
  },
  caution: {
    stroke: '#f59e0b',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'glow-amber',
  },
  danger: {
    stroke: '#ef4444',
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    glow: 'glow-red',
  },
  unknown: {
    stroke: '#6b7280',
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    glow: '',
  },
};

const SIZES = {
  sm: { size: 80, strokeWidth: 6, fontSize: 'text-lg' },
  md: { size: 140, strokeWidth: 8, fontSize: 'text-3xl' },
  lg: { size: 180, strokeWidth: 10, fontSize: 'text-4xl' },
};

export function ScoreGauge({
  score,
  level,
  confidence,
  size = 'md',
  showLabel = true,
}: ScoreGaugeProps) {
  const config = SIZES[size];
  const colors = LEVEL_COLORS[level];

  const { circumference, offset } = useMemo(() => {
    const radius = (config.size - config.strokeWidth) / 2;
    const circ = 2 * Math.PI * radius;
    const normalizedScore = Math.max(0, Math.min(100, score));
    const off = circ - (normalizedScore / 100) * circ;
    return { circumference: circ, offset: off };
  }, [score, config.size, config.strokeWidth]);

  const radius = (config.size - config.strokeWidth) / 2;
  const center = config.size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${colors.glow} rounded-full`}>
        <svg
          width={config.size}
          height={config.size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="gauge-progress transition-all duration-500 ease-out"
          />
        </svg>

        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${config.fontSize} ${colors.text}`}>
            {Math.round(score)}
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(confidence * 100)}% conf
            </span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-2">
          <span
            className={`badge ${
              level === 'safe'
                ? 'badge-safe'
                : level === 'caution'
                ? 'badge-caution'
                : level === 'danger'
                ? 'badge-danger'
                : 'badge-unknown'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
        </div>
      )}
    </div>
  );
}
