import { defineConfig, build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const commonResolve = {
  alias: {
    '@': resolve(__dirname, './extension/src'),
    '@shared': resolve(__dirname, './extension/src/shared'),
    '@components': resolve(__dirname, './extension/src/popup/components'),
    '@hooks': resolve(__dirname, './extension/src/popup/hooks'),
    '@store': resolve(__dirname, './extension/src/popup/store'),
  },
};

// Main config for popup (React app)
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-scripts',
      closeBundle: async () => {
        // Build content script as IIFE
        await build({
          configFile: false,
          resolve: commonResolve,
          build: {
            outDir: 'extension/dist',
            emptyOutDir: false,
            sourcemap: true,
            lib: {
              entry: resolve(__dirname, 'extension/src/content/content-script.ts'),
              name: 'contentScript',
              formats: ['iife'],
              fileName: () => 'content/content-script.js',
            },
            rollupOptions: {
              output: {
                extend: true,
              },
            },
          },
        });

        // Build service worker as ES module (for Manifest V3 with type: module)
        await build({
          configFile: false,
          resolve: commonResolve,
          build: {
            outDir: 'extension/dist',
            emptyOutDir: false,
            sourcemap: true,
            rollupOptions: {
              input: resolve(__dirname, 'extension/src/background/service-worker.ts'),
              output: {
                entryFileNames: 'background/service-worker.js',
                format: 'es',
              },
            },
          },
        });
      },
    },
  ],

  resolve: commonResolve,

  build: {
    outDir: 'extension/dist',
    emptyOutDir: true,
    sourcemap: true,

    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'extension/public/popup.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },

    target: 'esnext',
    chunkSizeWarningLimit: 2000,
  },

  server: {
    port: 3000,
    strictPort: true,
  },
});