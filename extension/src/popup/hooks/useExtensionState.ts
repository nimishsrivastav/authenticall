/**
 * useExtensionState Hook
 * Manages communication with the background service worker
 */

import { useEffect, useCallback, useRef } from 'react';
import { useExtensionStore } from '../store';
import { MessageType } from '../../shared/types/chrome-messages';
import type {
  TrustScoreSnapshot,
  Alert,
  SessionStatistics,
  MonitoringState,
  SessionInfo,
} from '../../shared/types/extension-state';

interface ExtensionStateResponse {
  monitoring: {
    state: MonitoringState;
    currentSession?: SessionInfo;
    error?: string;
  };
  trustScore: {
    current: TrustScoreSnapshot;
    history: TrustScoreSnapshot[];
  };
  alerts: {
    active: Alert[];
    history: Alert[];
  };
  statistics: SessionStatistics;
}

export function useExtensionState() {
  // Select state values
  const monitoringState = useExtensionStore((state) => state.monitoringState);
  const currentSession = useExtensionStore((state) => state.currentSession);
  const error = useExtensionStore((state) => state.error);
  const trustScore = useExtensionStore((state) => state.trustScore);
  const trustScoreHistory = useExtensionStore((state) => state.trustScoreHistory);
  const activeAlerts = useExtensionStore((state) => state.activeAlerts);
  const statistics = useExtensionStore((state) => state.statistics);
  const isConnected = useExtensionStore((state) => state.isConnected);

  // Select action functions (stable references)
  const setMonitoringState = useExtensionStore((state) => state.setMonitoringState);
  const setCurrentSession = useExtensionStore((state) => state.setCurrentSession);
  const setError = useExtensionStore((state) => state.setError);
  const setTrustScore = useExtensionStore((state) => state.setTrustScore);
  const addTrustScoreToHistory = useExtensionStore((state) => state.addTrustScoreToHistory);
  const setActiveAlerts = useExtensionStore((state) => state.setActiveAlerts);
  const addAlert = useExtensionStore((state) => state.addAlert);
  const dismissAlert = useExtensionStore((state) => state.dismissAlert);
  const clearAlertsAction = useExtensionStore((state) => state.clearAlerts);
  const setStatistics = useExtensionStore((state) => state.setStatistics);
  const setConnected = useExtensionStore((state) => state.setConnected);

  const listenerRef = useRef<((message: unknown) => void) | null>(null);

  // Fetch current state from background
  const fetchCurrentState = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_CURRENT_STATE,
        timestamp: Date.now(),
      });

      if (response?.success && response.data) {
        const data = response.data as ExtensionStateResponse;
        setMonitoringState(data.monitoring.state);
        setCurrentSession(data.monitoring.currentSession || null);
        setError(data.monitoring.error || null);
        setTrustScore(data.trustScore.current);
        setActiveAlerts(data.alerts.active);
        setStatistics(data.statistics);
        setConnected(true);
      }
    } catch (error) {
      console.error('Failed to fetch extension state:', error);
      setConnected(false);
    }
  }, [setMonitoringState, setCurrentSession, setError, setTrustScore, setActiveAlerts, setStatistics, setConnected]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    try {
      setMonitoringState('INITIALIZING' as MonitoringState);

      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        setError('No active tab found');
        setMonitoringState('ERROR' as MonitoringState);
        return;
      }

      // Send message to the tab's content script
      await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.START_MONITORING,
        timestamp: Date.now(),
      });

      setMonitoringState('ACTIVE' as MonitoringState);
      setError(null);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      setError('Failed to start monitoring. Make sure you are on a supported video call platform.');
      setMonitoringState('ERROR' as MonitoringState);
    }
  }, [setMonitoringState, setError]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.STOP_MONITORING,
          timestamp: Date.now(),
        });
      }

      setMonitoringState('IDLE' as MonitoringState);
      setCurrentSession(null);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  }, [setMonitoringState, setCurrentSession]);

  // Clear alerts
  const clearAlerts = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.CLEAR_ALERTS,
        timestamp: Date.now(),
      });
      clearAlertsAction();
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  }, [clearAlertsAction]);

  // Set up message listener
  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (typeof message !== 'object' || message === null || !('type' in message) || typeof (message as any).type !== 'string') return;
      const msg = message as { type: string; [key: string]: unknown };
      switch (msg.type) {
        case MessageType.TRUST_SCORE_UPDATE: {
          const score = msg.trustScore as TrustScoreSnapshot;
          setTrustScore(score);
          addTrustScoreToHistory(score);
          break;
        }
        case MessageType.ALERT_TRIGGERED: {
          const alert = msg.alert as Alert;
          addAlert(alert);
          break;
        }
        case MessageType.SESSION_STATS_UPDATE: {
          const stats = msg.stats as SessionStatistics;
          setStatistics(stats);
          break;
        }
      }
    };

    listenerRef.current = handleMessage;
    chrome.runtime.onMessage.addListener(handleMessage);

    // Fetch initial state
    fetchCurrentState();

    return () => {
      if (listenerRef.current) {
        chrome.runtime.onMessage.removeListener(listenerRef.current);
      }
    };
  }, [fetchCurrentState, setTrustScore, addTrustScoreToHistory, addAlert, setStatistics]);

  return {
    monitoringState,
    currentSession,
    error,
    trustScore,
    trustScoreHistory,
    activeAlerts,
    statistics,
    isConnected,
    dismissAlert,
    fetchCurrentState,
    startMonitoring,
    stopMonitoring,
    clearAlerts,
  };
}
