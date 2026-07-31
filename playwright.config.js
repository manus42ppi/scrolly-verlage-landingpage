import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    // wrangler pages dev statt http-server, damit Functions (functions/lead.js,
    // functions/leads-export.js) + eine lokal emulierte KV-Namespace mitgetestet werden.
    command:
      'npx wrangler pages dev public --port 4173 --compatibility-date=2026-07-31 ' +
      '--kv=LEADS_KV -b LEADS_EXPORT_USER=test-export-user -b LEADS_EXPORT_PASSWORD=test-export-pass',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
