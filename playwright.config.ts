import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
const isCI = Boolean(process.env['CI']);

/**
 * End-to-end tests against the production build (`pnpm build` first). `pnpm preview` serves its
 * static files with Vercel's `serve`; the tests stub the API routes.
 *
 * Screenshots differ between operating systems, so the visual project only runs on Linux:
 * in CI and locally through `pnpm test:visual`, both in the official Playwright image.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Three browser engines against one preview server overload a typical laptop; CI decides itself.
  ...(isCI ? {} : { workers: 4 }),
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 },
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'], testIgnore: /visual/ },
    { name: 'firefox', use: devices['Desktop Firefox'], testIgnore: /visual|a11y/ },
    { name: 'webkit', use: devices['Desktop Safari'], testIgnore: /visual|a11y/ },
    ...(process.platform === 'linux'
      ? [{ name: 'visual', use: devices['Desktop Chrome'], testMatch: /visual/ }]
      : []),
  ],
  webServer: {
    command: `pnpm preview --listen ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
  },
});
