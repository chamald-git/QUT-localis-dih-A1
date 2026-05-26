import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api calls to the Express server during development. This means the
    // client can call fetch('/api/health') with no CORS concerns and no need to
    // hardcode the backend port in component code. VITE_API_URL remains
    // available for production where the API lives on a different origin.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
