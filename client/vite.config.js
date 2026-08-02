import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
const RENDER_BACKEND = 'https://carerouteai.onrender.com';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || RENDER_BACKEND,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
