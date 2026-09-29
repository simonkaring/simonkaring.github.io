import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('content, responsive layout, and local routes', async ({ page, request }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SimonKaring.');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-sculpture]')).toHaveAttribute('data-rendering', /webgl|static|poster/, { timeout: 15000 });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => ({
      fits: document.documentElement.scrollWidth <= innerWidth,
      elements: [...document.querySelectorAll('main *, header *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).map(element => element.className).filter(Boolean),
    }));
    expect(overflow.fits, `overflow at ${width}px: ${overflow.elements.join(', ')}`).toBe(true);
  }
  await page.setViewportSize(testInfo.project.use.viewport || { width: 390, height: 844 });
  // Reveal each section before capturing a whole-page reference.
  for (const section of await page.locator('main > section').all()) { await section.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1100);
  await page.screenshot({ path: testInfo.outputPath('hero.png') });
  await page.screenshot({ path: testInfo.outputPath('portfolio.png'), fullPage: true });
  const localLinks = await page.locator('a[href^="/"]').evaluateAll(links => [...new Set(links.map(link => link.getAttribute('href').split('#')[0]))]);
  for (const link of localLinks) expect((await request.get(link || '/')).ok(), link).toBe(true);
  await page.goto('/config/mac/');
  await expect(page.getByRole('heading', { name: 'Mac Config' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('sculpture controls, theme persistence, and keyboard navigation', async ({ page, browserName }) => {
  page.on('console', message => { if (message.type() === 'error') console.log(message.text()); });
  await page.goto('/');
  const activate = page.getByRole('button', { name: 'Explore in 3D' });
  if (await activate.isVisible()) await activate.click();
  await expect(page.locator('[data-sculpture]')).toHaveAttribute('data-rendering', 'webgl', { timeout: 15000 });
  await page.waitForTimeout(1800);
  const renderedPixels = await page.locator('.sculpture-canvas').evaluate(async canvas => {
    const image = new Image();
    image.src = canvas.toDataURL();
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = 100; copy.height = 100;
    const context = copy.getContext('2d');
    context.drawImage(image, 0, 0, 100, 100);
    const data = context.getImageData(0, 0, 100, 100).data;
    return data.filter((value, index) => index % 4 === 3 && value > 0).length;
  });
  expect(renderedPixels, 'The WebGL canvas must contain visible sculpture geometry').toBeGreaterThan(500);
  await page.getByRole('button', { name: 'Exploded' }).click();
  await expect(page.getByRole('button', { name: 'Exploded' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-sculpture]')).toHaveAttribute('data-view', 'exploded');
  await page.getByRole('button', { name: 'Assembled' }).click();
  await expect(page.getByRole('button', { name: 'Assembled' })).toHaveAttribute('aria-pressed', 'true');
  const themeToggle = page.getByRole('button', { name: /Switch to .* theme/ });
  const label = await themeToggle.getAttribute('aria-label');
  await themeToggle.click();
  const expected = label.includes('light') ? 'light' : 'dark';
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
  await page.goto('/?keyboard');
  // Safari's default macOS keyboard setting uses Option-Tab to include links.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('accessible in both themes and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const theme of ['dark', 'light']) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(report.violations, theme).toEqual([]);
  }
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).scrollBehavior)).toBe('auto');
  expect(await page.locator('h1').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('content and artwork survive without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.sculpture-poster')).toBeVisible();
  await expect(page.locator('.sculpture-controls')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Find me on GitHub' })).toHaveAttribute('href', 'https://github.com/simonkaring');
  await context.close();
});

test('WebGL failure preserves the static artwork', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl')) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto('/');
  const activate = page.getByRole('button', { name: 'Explore in 3D' });
  if (await activate.isVisible()) await activate.click();
  await expect(page.locator('[data-sculpture]')).toHaveAttribute('data-rendering', 'static');
  await expect(page.locator('.sculpture-poster')).toHaveCSS('opacity', '1');
  await expect(page.locator('.sculpture-controls')).toBeHidden();
});
