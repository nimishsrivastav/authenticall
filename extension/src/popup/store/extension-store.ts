/**
 * Extension Store
 * Global state management for the popup using Zustand
 */

import { create } from 'zustand';
import type {
  MonitoringState,
  TrustScoreSnapshot,
  Alert,
  SessionStatistics,
  SessionInfo,
} from '../../shared/types/extension-state';

export interface ExtensionStore {
  // Monitoring state
  monitoringState: MonitoringState;
  currentSession: SessionInfo | null;
  error: string | null;

  // Trust score
  trustScore: TrustScoreSnapshot;
  trustScoreHistory: TrustScoreSnapshot[];

  // Alerts
  activeAlerts: Alert[];
  alertHistory: Alert[];

  // Statistics
  statistics: SessionStatistics;

  // Connection
  isConnected: boolean;

  // Actions
  setMonitoringState: (state: MonitoringState) => void;
  setCurrentSession: (session: SessionInfo | null) => void;
  setError: (error: string | null) => void;
  setTrustScore: (score: TrustScoreSnapshot) => void;
  addTrustScoreToHistory: (score: TrustScoreSnapshot) => void;
  setActiveAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  dismissAlert: (alertId: string) => void;
  clearAlerts: () => void;
  setStatistics: (stats: SessionStatistics) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

const DEFAULT_TRUST_SCORE_VALUE: TrustScoreSnapshot = {
  timestamp: Date.now(),
  overall: 0,
  visual: 0,
  audio: 0,
  behavioral: 0,
  confidence: 0,
  level: 'unknown',
};

const DEFAULT_STATISTICS: SessionStatistics = {
  sessionsTotal: 0,
  allTime: {
    totalDuration: 0,
    totalFramesAnalyzed: 0,
    totalAlertsTriggered: 0,
  },
};

export const useExtensionStore = create<ExtensionStore>((set) => ({
  // Initial state
  monitoringState: 'IDLE' as MonitoringState,
  currentSession: null,
  error: null,
  trustScore: DEFAULT_TRUST_SCORE_VALUE,
  trustScoreHistory: [],
  activeAlerts: [],
  alertHistory: [],
  statistics: DEFAULT_STATISTICS,
  isConnected: false,

  // Actions
  setMonitoringState: (state) => set({ monitoringState: state }),

  setCurrentSession: (session) => set({ currentSession: session }),

  setError: (error) => set({ error }),

  setTrustScore: (score) => set({ trustScore: score }),

  addTrustScoreToHistory: (score) =>
    set((state) => ({
      trustScoreHistory: [...state.trustScoreHistory.slice(-99), score],
    })),

  setActiveAlerts: (alerts) => set({ activeAlerts: alerts }),

  addAlert: (alert) =>
    set((state) => ({
      activeAlerts: [alert, ...state.activeAlerts],
      alertHistory: [alert, ...state.alertHistory.slice(0, 999)],
    })),

  dismissAlert: (alertId) =>
    set((state) => ({
      activeAlerts: state.activeAlerts.map((a) =>
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
    })),

  clearAlerts: () =>
    set({
      activeAlerts: [],
    }),

  setStatistics: (stats) => set({ statistics: stats }),

  setConnected: (connected) => set({ isConnected: connected }),

  reset: () =>
    set({
      monitoringState: 'IDLE' as MonitoringState,
      currentSession: null,
      error: null,
      trustScore: DEFAULT_TRUST_SCORE_VALUE,
      trustScoreHistory: [],
      activeAlerts: [],
      statistics: DEFAULT_STATISTICS,
      isConnected: false,
    }),
}));
