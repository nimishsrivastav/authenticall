/**
 * useTheme Hook
 * Theme management with system preference detection
 */

import { useEffect, useCallback } from 'react';
// import { useUIStore, type Theme } from '../store';
import { useUIStore } from '../store';

export function useTheme() {
  const { theme, setTheme, toggleTheme, getEffectiveTheme } = useUIStore();

  // Apply theme to document
  const applyTheme = useCallback((effectiveTheme: 'light' | 'dark') => {
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    // Apply initial theme
    applyTheme(getEffectiveTheme());

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, applyTheme, getEffectiveTheme]);

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(getEffectiveTheme());
  }, [theme, applyTheme, getEffectiveTheme]);

  return {
    theme,
    effectiveTheme: getEffectiveTheme(),
    setTheme,
    toggleTheme,
    isDark: getEffectiveTheme() === 'dark',
  };
}
