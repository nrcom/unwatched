import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In Docker: BACKEND_PROXY_URL=http://backend:3001
// Local dev (no Docker): BACKEND_PROXY_URL=http://localhost:3001
const backendProxy = process.env.BACKEND_PROXY_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: backendProxy,
        changeOrigin: true,
      },
    },
  },
});
