/**
 * StartStopButton Component
 * Toggle button for starting/stopping monitoring
 */


import type { MonitoringState } from '../../shared/types/extension-state';

interface StartStopButtonProps {
  state: MonitoringState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export function StartStopButton({
  state,
  onStart,
  onStop,
  disabled = false,
}: StartStopButtonProps) {
  const isActive = state === 'ACTIVE';
  const isLoading = state === 'INITIALIZING';
  const canInteract = !disabled && !isLoading;

  const handleClick = () => {
    if (!canInteract) return;
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!canInteract}
      className={`
        w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
        font-semibold text-white transition-all duration-200
        ${isActive
          ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
          : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-500'
        }
        ${!canInteract ? 'opacity-60 cursor-not-allowed' : ''}
        focus:outline-none focus:ring-2 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        transform active:scale-[0.98]
      `}
    >
      {isLoading ? (
        <>
          <LoadingSpinner />
          <span>Initializing...</span>
        </>
      ) : isActive ? (
        <>
          <StopIcon />
          <span>Stop Monitoring</span>
        </>
      ) : (
        <>
          <PlayIcon />
          <span>Start Monitoring</span>
        </>
      )}
    </button>
  );
}
