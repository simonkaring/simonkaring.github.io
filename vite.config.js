import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projects } from './src/content/projects.js';

const root = import.meta.dirname;

// Home page gets the project index injected from the shared content file.
const workIndex = () => ({
  name: 'work-index',
  async transformIndexHtml(html) {
    if (!html.includes('<!--work-list-->')) return html;
    const { renderWorkList } = await import(`${pathToFileURL(resolve(root, 'scripts/pages.mjs')).href}?t=${Date.now()}`);
    return html.replace('<!--work-list-->', renderWorkList());
  },
  configureServer(server) {
    // Regenerate case pages when content or templates change during development.
    server.watcher.on('change', async file => {
      if (!/src[\\/]content[\\/]|scripts[\\/]pages\.mjs/.test(file)) return;
      const { execFile } = await import('node:child_process');
      execFile('node', ['scripts/generate-work.mjs'], { cwd: root }, () => server.ws.send({ type: 'full-reload' }));
    });
  },
});

// Multi-page static build for GitHub Pages. Each HTML entry keeps its URL.
export default defineConfig({
  base: '/',
  publicDir: 'public',
  plugins: [workIndex()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    // three.js is lazy-loaded after first paint; the name and copy never wait on it.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        macConfig: resolve(root, 'config/mac/index.html'),
        ...Object.fromEntries(projects.map(p => [`work-${p.slug}`, resolve(root, `work/${p.slug}/index.html`)])),
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
