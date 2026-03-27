import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.GOOGLE_API_KEY': JSON.stringify(process.env.GOOGLE_API_KEY || env.GOOGLE_API_KEY || ''),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ''),
      'process.env.GEMINI_MODEL': JSON.stringify(process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-2.0-flash'),
    },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    build: { chunkSizeWarningLimit: 2000 },
    server: { hmr: process.env.DISABLE_HMR !== 'true' },
  };
});
