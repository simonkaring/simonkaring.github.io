import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

// Generate the lightweight, transparent fallback from the actual 3D scene.
// Run with a local Jekyll/preview server: node scripts/render-poster.mjs <url>
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await page.goto(process.argv[2] || 'http://127.0.0.1:4000');
  await page.locator('[data-rendering="webgl"]').waitFor();
  await page.waitForTimeout(1000);
  const image = await page.locator('.sculpture-canvas').evaluate(canvas => canvas.toDataURL('image/webp', 0.94).split(',')[1]);
  await writeFile('assets/sculpture.webp', Buffer.from(image, 'base64'));
  console.log('Updated assets/sculpture.webp from the procedural sculpture.');
} finally {
  await browser.close();
}
