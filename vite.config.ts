import { defineConfig } from 'vite';
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

  build: {
    outDir: 'extension/dist',
    emptyOutDir: true,
    sourcemap: true,
    
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'extension/src/popup/popup.html'),
        'service-worker': resolve(__dirname, 'extension/src/background/service-worker.ts'),
        'content-script': resolve(__dirname, 'extension/src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Service worker and content script need specific names
          if (chunkInfo.name === 'service-worker') {
            return 'background/service-worker.js';
          }
          if (chunkInfo.name === 'content-script') {
            return 'content/content-script.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Optimize for extension
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
      },
    } as any,
    
    // Target for Chrome extensions
    target: 'esnext',
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },

  // Dev server configuration
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
});