/**
 * TrustScoreDisplay Component
 * Main trust score display with gauge and breakdown
 */

import { useMemo } from 'react';
import { ScoreGauge } from './ScoreGauge';
import { ComponentBreakdown } from './ComponentBreakdown';
import { TrendIndicator, type TrendDirection } from './TrendIndicator';
import type { TrustScoreSnapshot } from '../../shared/types/extension-state';

interface TrustScoreDisplayProps {
  currentScore: TrustScoreSnapshot;
  history: TrustScoreSnapshot[];
}

export function TrustScoreDisplay({ currentScore, history }: TrustScoreDisplayProps) {
  // Calculate trend from history
  const { trend, change } = useMemo(() => {
    if (history.length < 5) {
      return { trend: 'stable' as TrendDirection, change: 0 };
    }

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);

    if (older.length === 0) {
      return { trend: 'stable' as TrendDirection, change: 0 };
    }

    const recentAvg = recent.reduce((sum, s) => sum + s.overall, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.overall, 0) / older.length;
    const diff = recentAvg - olderAvg;

    let direction: TrendDirection = 'stable';
    if (diff > 5) direction = 'improving';
    else if (diff < -5) direction = 'declining';

    return { trend: direction, change: diff };
  }, [history]);

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trust Score
        </h2>
        <TrendIndicator trend={trend} change={change} />
      </div>

      {/* Main Gauge */}
      <div className="flex justify-center py-4">
        <ScoreGauge
          score={currentScore.overall}
          level={currentScore.level}
          confidence={currentScore.confidence}
          size="lg"
        />
      </div>

      {/* Component Breakdown */}
      <ComponentBreakdown
        visual={currentScore.visual}
        behavioral={currentScore.behavioral}
        audio={currentScore.audio}
      />

      {/* Last updated */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500">
        Last updated: {new Date(currentScore.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
