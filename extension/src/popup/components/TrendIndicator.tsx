/**
 * TrendIndicator Component
 * Shows trend direction with animated arrow
 */



export type TrendDirection = 'improving' | 'stable' | 'declining';

interface TrendIndicatorProps {
  trend: TrendDirection;
  change?: number;
  showLabel?: boolean;
}

const ArrowUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

export function TrendIndicator({
  trend,
  change,
  showLabel = true,
}: TrendIndicatorProps) {
  const config = {
    improving: {
      icon: <ArrowUpIcon />,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
      label: 'Improving',
    },
    stable: {
      icon: <MinusIcon />,
      color: 'text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-800',
      label: 'Stable',
    },
    declining: {
      icon: <ArrowDownIcon />,
      color: 'text-red-500',
      bg: 'bg-red-100 dark:bg-red-900/30',
      label: 'Declining',
    },
  };

  const { icon, color, bg, label } = config[trend];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bg}`}>
      <span className={`${color} transition-transform ${trend === 'improving' ? 'animate-bounce-slow' : ''}`}>
        {icon}
      </span>
      {showLabel && (
        <span className={`text-xs font-medium ${color}`}>
          {label}
          {change !== undefined && change !== 0 && (
            <span className="ml-1">
              ({change > 0 ? '+' : ''}{change.toFixed(1)}%)
            </span>
          )}
        </span>
      )}
    </div>
  );
}
