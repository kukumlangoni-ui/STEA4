import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// NOTE: base is set to '/' for Vercel/production deployment.
// If deploying to GitHub Pages subfolder, change to '/STEA/'
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split large vendor chunks for faster loading
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'motion': ['motion/react'],
          'lucide': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
