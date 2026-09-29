import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page static build for GitHub Pages. Each HTML entry keeps its URL.
export default defineConfig({
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    // three.js is lazy-loaded after first paint; the name and copy never wait on it.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        macConfig: resolve(import.meta.dirname, 'config/mac/index.html'),
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
