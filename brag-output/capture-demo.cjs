// Captures real frontend screens with synthetic, empty responses. All writes blocked.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => { sessionStorage.setItem('E2E_BYPASS', '1'); localStorage.setItem('svt_sidebar_collapsed', '0'); });
  await context.route('**/api/**', route => {
    if (route.request().method() !== 'GET') return route.fulfill({ status: 403, json: { message: 'Demo: writes disabled' } });
    const p = new URL(route.request().url()).pathname;
    let data = [];
    if (p.endsWith('/analytics/overview')) data = { revenue: {}, jobs: {}, quality: {}, invoices: {} };
    else if (p.endsWith('/analytics/pending-items')) data = { summary: {} };
    else if (p.endsWith('/jobcards/stats')) data = {};
    return route.fulfill({ json: { success: true, data, pagination: { total: 0, page: 1, totalPages: 1 } } });
  });
  const page = await context.newPage();
  const dir = path.join(__dirname, 'composition/assets/screens');
  fs.mkdirSync(dir, { recursive: true });
  const capture = async (route, file, action) => {
    await page.goto('http://localhost:5173' + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    if (action) await action();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, file) });
    console.log(`${route} -> ${file}`);
  };
  await capture('/jobwork/inward-entry', '01-inward.png', async () => {
    await page.getByRole('button', { name: 'Add first item' }).click();
    await page.getByPlaceholder('Part name').fill('Demo tool');
  });
  await capture('/jobcards/new', '02-job-card.png');
  await capture('/manufacturing/runsheet/new', '03-runsheet.png');
  await capture('/quality/certificates/new', '04-certificate.png');
  await capture('/invoices/new', '05-invoice.png');
  await browser.close();
})().catch(err => { console.error(err); process.exitCode = 1; });
