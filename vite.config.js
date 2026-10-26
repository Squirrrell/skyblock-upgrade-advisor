import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  // GitHub Pages serves the site from /<repo>/, set by the deploy workflow.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // The analysis code in ../shared is imported by the static build.
    fs: { allow: ['..'] },
    proxy: {
      '/api': `http://localhost:${process.env.PORT || 8787}`,
    },
  },
});
