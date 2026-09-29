// Writes /work/<slug>/index.html for every project. Output is gitignored and
// regenerated before `npm run dev` and `npm run build`.
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { projects, renderCasePage } from './pages.mjs';

for (const project of projects) {
  await mkdir(`work/${project.slug}`, { recursive: true });
  await writeFile(`work/${project.slug}/index.html`, renderCasePage(project));
}
console.log(`generated ${projects.length} case study pages`);

// Everything in public/ is published, referenced or not. Only images used by a
// case study may ship, so a removed screenshot can never go live by accident.
const referenced = new Set(projects.flatMap(p => p.images.map(i => `public${i.src}`)));
const files = (await readdir('public/work', { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
  .map(entry => `${entry.parentPath ?? entry.path}/${entry.name}`);
const stray = files.filter(file => !referenced.has(file));
if (stray.length) {
  const message = `Unreferenced files in public/work would be published:\n  ${stray.join('\n  ')}\nDelete them or reference them in src/content/projects.js.`;
  if (process.env.CI) { console.error(message); process.exit(1); }
  console.warn(`warning: ${message}`);
}
