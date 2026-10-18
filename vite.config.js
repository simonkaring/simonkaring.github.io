import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projects } from './src/content/projects.js';

import { readFileSync } from 'node:fs';

const root = import.meta.dirname;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Home page gets the project index injected; config page gets the statusline script injected.
const workIndex = () => ({
  name: 'work-index',
  async transformIndexHtml(html) {
    let out = html;
    if (out.includes('<!--work-list-->')) {
      const { renderWorkList } = await import(`${pathToFileURL(resolve(root, 'scripts/pages.mjs')).href}?t=${Date.now()}`);
      out = out.replace('<!--work-list-->', renderWorkList());
    }
    if (out.includes('<!--statusline-sh-->')) {
      const statuslinePath = resolve(root, 'public/statusline.sh');
      const rawScript = readFileSync(statuslinePath, 'utf8');
      // A callback keeps shell tokens such as $& literal in the replacement.
      out = out.replace('<!--statusline-sh-->', () => escapeHtml(rawScript));
    }
    return out;
  },
  configureServer(server) {
    // Regenerate case pages when content or templates change during development.
    server.watcher.on('change', async file => {
      if (/public[\\/]statusline\.sh/.test(file)) {
        server.ws.send({ type: 'full-reload' });
        return;
      }
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
        config: resolve(root, 'config/index.html'),
        ...Object.fromEntries(projects.map(p => [`work-${p.slug}`, resolve(root, `work/${p.slug}/index.html`)])),
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
