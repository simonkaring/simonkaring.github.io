import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('assets/fonts', { recursive: true });
for (const font of ['manrope', 'space-grotesk']) {
  await copyFile(`node_modules/@fontsource-variable/${font}/files/${font}-latin-wght-normal.woff2`, `assets/fonts/${font}-latin.woff2`);
  await copyFile(`node_modules/@fontsource-variable/${font}/LICENSE`, `assets/fonts/${font}-LICENSE.txt`);
}
await build({
  entryPoints: ['src/main.js', 'src/sculpture.js'],
  outdir: 'assets/js',
  bundle: true,
  minify: true,
  splitting: true,
  format: 'esm',
  target: ['es2022'],
  legalComments: 'linked',
});
await copyFile('node_modules/three/LICENSE', 'assets/js/three-LICENSE.txt');
