/**
 * App Component
 * Main application component for the popup
 */

import { useEffect } from 'react';
import { Header } from './Header';
import { TrustScoreDisplay } from './TrustScoreDisplay';
import { ControlPanel } from './ControlPanel';
import { AlertPanel } from './AlertPanel';
import { SettingsPanel } from './SettingsPanel';
import { SessionStats } from './SessionStats';
import { useExtensionState, useSettings, useTheme } from '../hooks';
import { useUIStore } from '../store';

export function App() {
  const { currentView, setCurrentView } = useUIStore();
  const { isDark, toggleTheme } = useTheme();

  const {
    monitoringState,
    currentSession,
    error,
    trustScore,
    trustScoreHistory,
    activeAlerts,
    statistics,
    isConnected,
    startMonitoring,
    stopMonitoring,
    dismissAlert,
    clearAlerts,
    fetchCurrentState,
  } = useExtensionState();

  const {
    settings,
    updateSetting,
    updateThreshold,
    saveSettings,
    resetToDefaults,
    validateApiKey,
    isSaving,
    hasUnsavedChanges,
  } = useSettings();

  // Refresh state periodically when monitoring
  useEffect(() => {
    if (monitoringState === 'ACTIVE') {
      const interval = setInterval(fetchCurrentState, 2000);
      return () => clearInterval(interval);
    }
    return;
  }, [monitoringState, fetchCurrentState]);

  const isActive = monitoringState === 'ACTIVE';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header with navigation */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isConnected={isConnected}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentView === 'dashboard' && (
          <>
            {/* Control Panel */}
            <ControlPanel
              state={monitoringState}
              session={currentSession}
              error={error}
              onStart={startMonitoring}
              onStop={stopMonitoring}
            />

            {/* Trust Score */}
            {isActive && (
              <TrustScoreDisplay
                currentScore={trustScore}
                history={trustScoreHistory}
              />
            )}

            {/* Quick Alerts Summary */}
            {activeAlerts.filter((a) => !a.dismissed).length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Recent Alerts
                  </h3>
                  <button
                    onClick={() => setCurrentView('alerts')}
                    className="text-sm text-indigo-500 hover:text-indigo-600"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-2">
                  {activeAlerts
                    .filter((a) => !a.dismissed)
                    .slice(0, 3)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                          alert.severity === 'critical'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            : alert.severity === 'high'
                            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        <svg
                          className="w-4 h-4 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span className="truncate">{alert.title}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Getting Started - shown when not active and no API key */}
            {!isActive && !settings.apiKey && (
              <div className="card p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Get Started
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Configure your Gemini API key to start analyzing video calls.
                </p>
                <button
                  onClick={() => setCurrentView('settings')}
                  className="btn-primary"
                >
                  Go to Settings
                </button>
              </div>
            )}
          </>
        )}

        {currentView === 'alerts' && (
          <AlertPanel
            alerts={activeAlerts}
            onDismiss={dismissAlert}
            onClearAll={clearAlerts}
          />
        )}

        {currentView === 'analytics' && (
          <SessionStats statistics={statistics} isActive={isActive} />
        )}

        {currentView === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSetting={updateSetting}
            onUpdateThreshold={updateThreshold}
            onSave={saveSettings}
            onReset={resetToDefaults}
            onValidateApiKey={validateApiKey}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200 dark:border-gray-800">
        VibeCheck AI v1.0.0 - Powered by Gemini
      </footer>
    </div>
  );
}
