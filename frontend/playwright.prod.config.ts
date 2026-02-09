import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'prod-*.spec.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'https://tomoe-faq.vercel.app',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
