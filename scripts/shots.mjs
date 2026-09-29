// Visual review: node scripts/shots.mjs (against `npm run preview`).
// Env: URL (default http://127.0.0.1:4321), OUT (output dir), ONLY (comma list: home,work,case).
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL || 'http://127.0.0.1:4321';
const out = process.env.OUT || 'test-results/shots';
const only = (process.env.ONLY || 'home,work,case').split(',');
const cases = (process.env.CASES || 'servicehub,voltlink,gitty').split(',');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const devices = [
  ['desktop', { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }],
  ['mobile', { viewport: { width: 390, height: 844 }, colorScheme: 'light', deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
];
const settle = page => page.waitForFunction(() => document.documentElement.dataset.rendering, null, { timeout: 15000 }).catch(() => {});
const scrollTo = (page, y) => page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);

for (const [label, options] of devices) {
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  if (only.includes('home')) {
    await page.goto(base);
    await settle(page);
    await page.waitForTimeout(3200);
    await page.screenshot({ path: `${out}/${label}-hero.png` });
    await scrollTo(page, options.viewport.height * 1.1);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/${label}-about.png` });
  }
  if (only.includes('work')) {
    await page.goto(`${base}/#work`);
    await settle(page);
    await page.waitForTimeout(2500);
    const row = page.locator('.work-row').nth(3);
    await row.scrollIntoViewIfNeeded();
    if (label === 'desktop') await row.hover();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${label}-work.png` });
  }
  if (only.includes('case')) {
    for (const slug of cases) {
      await page.goto(`${base}/work/${slug}/`);
      await page.waitForTimeout(600);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const step = options.viewport.height;
      for (let y = 0, i = 0; y < height && i < 6; y += step, i += 1) {
        await scrollTo(page, y);
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${out}/${label}-${slug}-${i}.png` });
      }
    }
  }
  console.log(label, errors.length ? errors : 'no errors');
  await page.close();
}
await browser.close();
