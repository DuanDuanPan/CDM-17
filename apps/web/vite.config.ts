import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@cdm/core-client': path.resolve(__dirname, '../../packages/core-client/src'),
      '@cdm/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
      '@cdm/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
});
