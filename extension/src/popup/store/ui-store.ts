/**
 * UI Store
 * Theme and navigation management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type View = 'dashboard' | 'alerts' | 'settings' | 'analytics';

export interface UIStore {
  theme: Theme;
  currentView: View;
  isSidebarOpen: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setCurrentView: (view: View) => void;
  toggleSidebar: () => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      currentView: 'dashboard',
      isSidebarOpen: false,

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme:
            state.theme === 'light'
              ? 'dark'
              : state.theme === 'dark'
              ? 'system'
              : 'light',
        })),

      setCurrentView: (view) => set({ currentView: view }),

      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      getEffectiveTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'vibecheck-ui-settings',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
