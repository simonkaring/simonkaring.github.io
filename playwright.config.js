import { defineConfig, devices } from '@playwright/test';

// CI runners have no GPU: give Chromium its software WebGL renderer so the network can render.
const chromiumArgs = process.env.CI ? { launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } : {};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4321', trace: 'retain-on-failure' },
  // Tests run against the production build (`npm run build` first).
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', ...chromiumArgs } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', colorScheme: 'light', ...chromiumArgs } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], colorScheme: 'dark' } },
  ],
});
