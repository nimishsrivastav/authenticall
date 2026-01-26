/**
 * ThresholdControls Component
 * Controls for adjusting trust score thresholds
 */



interface ThresholdControlsProps {
  thresholds: {
    safe: number;
    caution: number;
    danger: number;
  };
  onChange: (key: 'safe' | 'caution' | 'danger', value: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

interface ThresholdSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  color: string;
  description: string;
  disabled?: boolean;
}

function ThresholdSlider({
  label,
  value,
  onChange,
  min,
  max,
  color,
  description,
  disabled,
}: ThresholdSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
            disabled={disabled}
            min={min}
            max={max}
            className="w-16 px-2 py-1 text-sm text-center rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
          />
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        min={min}
        max={max}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          accentColor: color.includes('green') ? '#10b981' : color.includes('amber') ? '#f59e0b' : '#ef4444',
        }}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

export function ThresholdControls({
  thresholds,
  onChange,
  onReset,
  disabled = false,
}: ThresholdControlsProps) {
  const isDefault =
    thresholds.safe === 85 && thresholds.caution === 50 && thresholds.danger === 0;

  // Validate thresholds (safe > caution > danger)
  const isValid =
    thresholds.safe > thresholds.caution && thresholds.caution > thresholds.danger;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Trust Thresholds</label>
        {!isDefault && (
          <button
            onClick={onReset}
            disabled={disabled}
            className="text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
          >
            Reset to defaults
          </button>
        )}
      </div>

      <div className="space-y-5 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <ThresholdSlider
          label="Safe"
          value={thresholds.safe}
          onChange={(v) => onChange('safe', v)}
          min={thresholds.caution + 1}
          max={100}
          color="bg-green-500"
          description={`Score >= ${thresholds.safe} is considered safe`}
          disabled={disabled}
        />

        <ThresholdSlider
          label="Caution"
          value={thresholds.caution}
          onChange={(v) => onChange('caution', v)}
          min={thresholds.danger + 1}
          max={thresholds.safe - 1}
          color="bg-amber-500"
          description={`Score >= ${thresholds.caution} and < ${thresholds.safe} needs caution`}
          disabled={disabled}
        />

        <ThresholdSlider
          label="Danger"
          value={thresholds.danger}
          onChange={(v) => onChange('danger', v)}
          min={0}
          max={thresholds.caution - 1}
          color="bg-red-500"
          description={`Score < ${thresholds.caution} is dangerous`}
          disabled={disabled}
        />
      </div>

      {/* Validation warning */}
      {!isValid && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Thresholds must be: Safe &gt; Caution &gt; Danger
        </p>
      )}

      {/* Preview */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Preview:</span>
        <div className="flex-1 h-4 rounded-full overflow-hidden flex">
          <div
            className="bg-red-500 h-full"
            style={{ width: `${thresholds.caution}%` }}
          />
          <div
            className="bg-amber-500 h-full"
            style={{ width: `${thresholds.safe - thresholds.caution}%` }}
          />
          <div
            className="bg-green-500 h-full"
            style={{ width: `${100 - thresholds.safe}%` }}
          />
        </div>
      </div>
    </div>
  );
}
