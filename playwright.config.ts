import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const baseURL = `http://localhost:${port}`;
const databasePath = path.join(os.tmpdir(), `gatherly-browser-${process.pid}.db`);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' } }],
  webServer: {
    command: `"${process.execPath}" node_modules/next/dist/bin/next dev -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: databasePath,
      APP_ORIGIN: '',
      GEMINI_API_KEY: '',
      EXAMPLE_ACCOUNT_ENABLED: 'false',
    },
  },
});
