import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // one shared Stockfish per page is fine, but keep CI load low
  workers: CI ? 1 : 2,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
    // Local runs use the installed Chrome; CI installs Playwright's Chromium.
    ...(CI ? {} : { channel: 'chrome' }),
    headless: !process.env.P2P,
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /layout\.spec\.ts/ },
  ],
  webServer: { command: 'npm run dev -- --port 5180 --strictPort', url: 'http://localhost:5180', reuseExistingServer: !CI, timeout: 60_000 },
})
