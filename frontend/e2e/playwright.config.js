/** Playwright config for E2E tests */
export default {
  testDir: './tests',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    // Optional system Chromium for isolated CI environments; otherwise Playwright's browser is used.
    launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  },
  reporter: [['list'], ['html', { open: 'never' }]],
};
