/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './extension/src/popup/**/*.{html,tsx,ts}',
    './extension/src/components/**/*.{tsx,ts}',
  ],
  
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          primary: '#6366f1', // Indigo
          secondary: '#8b5cf6', // Violet
          accent: '#ec4899', // Pink
        },
        
        // Trust score colors
        trust: {
          safe: '#10b981', // Green
          caution: '#f59e0b', // Amber
          danger: '#ef4444', // Red
          unknown: '#6b7280', // Gray
        },
        
        // Semantic colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        
        // Background colors
        bg: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
        },
        
        // Dark mode
        dark: {
          bg: {
            primary: '#1f2937',
            secondary: '#111827',
            tertiary: '#0f172a',
          },
          text: {
            primary: '#f9fafb',
            secondary: '#d1d5db',
            tertiary: '#9ca3af',
          },
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      
      borderRadius: {
        '4xl': '2rem',
      },
      
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 15px rgba(99, 102, 241, 0.5)',
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.5)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.5)',
      },
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      transitionDuration: {
        '2000': '2000ms',
      },
    },
  },
  
  plugins: [],
  
  darkMode: 'class',
};