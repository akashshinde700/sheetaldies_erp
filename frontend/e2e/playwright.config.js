/** Playwright config for E2E tests */
module.exports = {
  testDir: './tests',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
};
