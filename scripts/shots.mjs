import { chromium } from '@playwright/test';

const base = process.env.URL || 'http://127.0.0.1:4173';
const out = process.env.OUT || '/var/folders/z4/72jgz2h11qx8760vfrs3g0vw0000gn/T/opencode/shots';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [label, viewport, scheme] of [['desktop', { width: 1440, height: 900 }, 'dark'], ['mobile', { width: 390, height: 844 }, 'light']]) {
  const page = await browser.newPage({ viewport, colorScheme: scheme, deviceScaleFactor: label === 'mobile' ? 2 : 1, hasTouch: label === 'mobile', isMobile: label === 'mobile' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => document.documentElement.dataset.rendering, null, { timeout: 15000 }).catch(() => {});
  console.log(label, 'rendering =', await page.evaluate(() => document.documentElement.dataset.rendering));
  await page.waitForTimeout(3200);
  if (label === 'desktop') { await page.mouse.move(520, 380); await page.waitForTimeout(100); await page.mouse.move(560, 400); await page.waitForTimeout(700); }
  await page.screenshot({ path: `${out}/${label}-hero.png` });
  for (const [i, frac] of [[1, 0.45], [2, 1.0], [3, 1.8]]) {
    await page.evaluate(f => window.scrollTo({ top: innerHeight * f, behavior: 'instant' }), frac);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/${label}-scroll${i}.png` });
  }
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${label}-end.png` });
  console.log(label, 'errors:', errors);
  await page.close();
}
await browser.close();
