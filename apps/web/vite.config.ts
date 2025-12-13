import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/layout': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/graph': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/audit': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/metrics': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/visits': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:4000', ws: true, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@cdm/core-client': path.resolve(__dirname, '../../packages/core-client/src'),
      '@cdm/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
      '@cdm/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
});
