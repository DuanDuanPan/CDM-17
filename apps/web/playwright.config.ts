import { defineConfig, devices } from '@playwright/test';

const localBypass = ['127.0.0.1', 'localhost', '::1'];
const existingNoProxy = process.env.NO_PROXY || process.env.no_proxy;
const mergedNoProxy = existingNoProxy ? `${existingNoProxy},${localBypass.join(',')}` : localBypass.join(',');
process.env.NO_PROXY = mergedNoProxy;
process.env.no_proxy = mergedNoProxy;

export default defineConfig({
  testDir: './tests',
  timeout: 10_000,
  expect: { timeout: 5_000 },
  workers: 1,
  reporter: [['list']],
  globalSetup: './playwright.global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter @cdm/web dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
