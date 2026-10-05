import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const rendering = page => page.locator('html');

// Load the page fresh in each colour scheme rather than flipping the theme on a live page:
// WebKit on slow CI runners can be read mid-restyle, which gives false contrast failures.
async function expectAccessibleInBothThemes(page, path) {
  for (const theme of ['dark', 'light']) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(t => {
      try { localStorage.setItem('sk-theme', t); } catch (_) {}
    }, theme);
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(report.violations, `${path} ${theme}`).toEqual([]);
  }
}

test('content, responsive layout and local routes', async ({ page, request }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Simon\s*Karing/);
  await expect(rendering(page)).toHaveAttribute('data-rendering', /webgl|static/, { timeout: 15000 });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    expect(fits, `horizontal overflow at ${width}px`).toBe(true);
  }
  await page.setViewportSize(testInfo.project.use.viewport || { width: 390, height: 844 });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: testInfo.outputPath('hero.png') });
  const localLinks = await page.locator('a[href^="/"]').evaluateAll(links => [...new Set(links.map(link => link.getAttribute('href').split('#')[0]))]);
  for (const link of localLinks) expect((await request.get(link || '/')).ok(), link).toBe(true);
  await page.goto('/config/');
  await expect(page.getByRole('heading', { level: 1, name: /Fresh machine/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('network renders visible geometry and reacts to scroll', async ({ page }) => {
  await page.goto('/');
  // Some headless environments have no WebGL at all; the fallback has its own test below.
  const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  test.skip(!webgl, 'WebGL is unavailable in this browser environment');
  await expect(rendering(page)).toHaveAttribute('data-rendering', 'webgl', { timeout: 15000 });
  await page.waitForTimeout(2800);
  const coverage = () => page.locator('[data-network]').evaluate(async canvas => {
    // Read inside the next frame, after the render loop has drawn but before the buffer is presented.
    const url = await new Promise(resolve => requestAnimationFrame(() => resolve(canvas.toDataURL())));
    const image = new Image();
    image.src = url;
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = 160; copy.height = 100;
    const context = copy.getContext('2d');
    context.drawImage(image, 0, 0, 160, 100);
    const data = context.getImageData(0, 0, 160, 100).data;
    let lit = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) lit += 1;
    return lit;
  });
  expect(await coverage(), 'the name should be drawn by the network').toBeGreaterThan(300);
  // The real heading stays in the DOM for assistive technology even when drawn by WebGL.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  await page.evaluate(() => window.scrollTo({ top: innerHeight * 1.2, behavior: 'instant' }));
  await page.waitForTimeout(1500);
  expect(await coverage(), 'the system layout should remain visible behind the about section').toBeGreaterThan(300);
});

test('theme persistence and keyboard navigation', async ({ page, browserName }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /Switch to .* theme/ });
  const label = await toggle.getAttribute('aria-label');
  await toggle.click();
  const expected = label.includes('light') ? 'light' : 'dark';
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('accessible in both themes with reduced motion', async ({ page }) => {
  await expectAccessibleInBothThemes(page, '/');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).scrollBehavior)).toBe('auto');
  await expect(page.locator('.reveal').first()).toHaveCSS('opacity', '1');
});

test('content survives without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  await expect(page.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/simonkaring');
  await context.close();
});

test('WebGL failure keeps the typographic name', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl')) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto('/');
  await expect(rendering(page)).toHaveAttribute('data-rendering', 'static', { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)');
});

test('case study pages render, fit and are accessible', async ({ page }) => {
  await page.goto('/');
  const links = await page.locator('.work-row').evaluateAll(rows => rows.map(row => [row.getAttribute('href'), row.dataset.cluster]));
  expect(links.length).toBe(9);
  expect(new Set(links.map(([, cluster]) => cluster)).size, 'each project maps to its own cluster').toBe(9);
  for (const [href] of links) {
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Next project/ })).toBeVisible();
    for (const img of await page.locator('main img').all()) expect(await img.getAttribute('alt'), `${href} image alt`).toBeTruthy();
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${href} overflow at 320px`).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  for (const slug of ['servicehub', 'voltlink']) await expectAccessibleInBothThemes(page, `/work/${slug}/`);
});

test('config page renders, fits and is accessible', async ({ page }, testInfo) => {
  await page.goto('/config/');
  await expect(page.getByRole('heading', { level: 1, name: /Fresh machine/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'macOS' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Linux' })).toBeVisible();
  // Each platform keeps its install commands, and the agent settings carry the deny rules.
  expect(await page.locator('.app-list li').count()).toBeGreaterThan(20);
  await expect(page.locator('.code', { hasText: 'git push' })).not.toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `config overflow at ${width}px`).toBe(true);
  }
  const nav = page.getByRole('navigation', { name: 'On this page' });
  await nav.getByRole('link', { name: 'Linux', exact: true }).click();
  await expect(nav).toHaveClass(/is-docked/);
  await expect(nav.locator('.config-nav-inner')).toHaveCSS('position', 'fixed');
  await expect(nav.locator('.config-nav-inner')).toHaveCSS('writing-mode', 'vertical-rl');
  await expect(nav.getByRole('link', { name: 'Linux', exact: true })).toHaveClass(/is-active/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav).toHaveCSS('position', 'sticky');
  await expect(nav.locator('.config-nav-inner')).toHaveCSS('writing-mode', 'horizontal-tb');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(nav).not.toHaveClass(/is-docked/);
  await expect(nav.locator('.config-nav-inner')).toHaveCSS('position', 'static');
  await page.setViewportSize(testInfo.project.use.viewport || { width: 390, height: 844 });
  await expectAccessibleInBothThemes(page, '/config/');
});
