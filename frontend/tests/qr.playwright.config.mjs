import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'qrCamera.spec.mjs', workers: 1, timeout: 45000,
  outputDir: '../test-results',
  use: { baseURL: 'http://localhost:5179',
    launchOptions: process.env.QR_TEST_BROWSER ? { executablePath: process.env.QR_TEST_BROWSER } : {},
  },
  webServer: { command: 'npm run dev -- --host localhost --port 5179 --strictPort',
    url: 'http://localhost:5179', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
