import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './extension/src'),
      '@shared': resolve(__dirname, './extension/src/shared'),
      '@components': resolve(__dirname, './extension/src/popup/components'),
      '@hooks': resolve(__dirname, './extension/src/popup/hooks'),
      '@store': resolve(__dirname, './extension/src/popup/store'),
    },
  },

  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'tailwind.config.js',
        'postcss.config.js',
      ],
    },

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Watch options
    watch: false,
    
    // Reporter
    reporters: ['verbose'],
    
    // Mocking
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
});