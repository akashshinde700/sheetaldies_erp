/* Read-only screen tour. All /api calls are mocked; never use this as an E2E test. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.env.UI_BASE || 'http://localhost:5173';
const output = process.env.TOUR_OUTPUT || '/tmp/sheetal-training-frames';
const screens = [
  ['/login', '1. LOGIN', 'Email aur password se Sign In karein; OTP ke liye OTP Login chunein.'],
  ['/', '2. DASHBOARD', 'Overview aur recent job cards dekhein. Menu se module kholein.'],
  ['/admin/parties', '3. PARTY MASTER', 'Customer aur processor ki details pehle banayein aur verify karein.'],
  ['/admin/processes', '4. PROCESS MASTER', 'Treatment process, rate aur HSN/SAC ko verify karein.'],
  ['/admin/machines', '5. MACHINE MASTER', 'Machine / furnace master maintain karein.'],
  ['/jobwork/inward-entry', '6. INWARD ENTRY', 'Customer, processor aur item details bhar kar challan banayein.'],
  ['/jobwork/register', '7. INWARD / OUTWARD REGISTER', 'Challan list, status aur related actions yahan dekhein.'],
  ['/jobcards', '8. JOB CARDS', 'Challan se linked job card aur inspection details dekhein.'],
  ['/manufacturing/planning', '9. PRODUCTION PLANNING', 'Production aur furnace ka daily plan dekhein.'],
  ['/manufacturing/runsheet', '10. VHT RUN SHEETS', 'Job card ke liye run sheet aur treatment details dekhein.'],
  ['/quality/certificates', '11. TEST CERTIFICATES', 'Treatment aur test details verify karke certificate banayein.'],
  ['/quality/rework-data', '12. REWORK', 'Rework records aur quality information maintain karein.'],
  ['/quality/nc-register', '13. NC REGISTER', 'Non-conformance records ko review karein.'],
  ['/invoices', '14. TAX INVOICES', 'Invoice banane se pehle party, items, rates aur tax verify karein.'],
  ['/dispatch', '15. DISPATCH', 'Dispatch challan aur delivery details review karein.'],
  ['/pending', '16. PENDING', 'Har stage par pending kaam track karein.'],
  ['/inventory', '17. INVENTORY', 'Stock records dekhein.'],
  ['/analytics', '18. ANALYTICS', 'Reports aur business overview dekhein.'],
  ['/admin/users', '19. USER ACCESS', 'Admin users aur access manage karta hai.'],
];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const executablePath = process.env.CHROMIUM_PATH || (process.env.SPARTICUZ_CHROMIUM ? await require('@sparticuz/chromium').default.executablePath() : undefined);
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route('**/api/**', async route => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fulfill({ status: 403, json: { message: 'Demo: writes disabled' } });
    const url = new URL(req.url());
    let data = [];
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ status: 401, json: { message: 'Demo' } });
    if (url.pathname.endsWith('/analytics/overview')) data = { revenue: {}, jobs: {}, quality: {}, invoices: {} };
    else if (url.pathname.endsWith('/analytics/pending-items')) data = { summary: {} };
    else if (url.pathname.endsWith('/jobcards/stats')) data = {};
    else if (url.pathname.endsWith('/quality/rework-entries')) data = { entries: [], totals: {}, causes: [], correctiveActions: [] };
    return route.fulfill({ json: { success: true, data, pagination: { total: 0, page: 1, totalPages: 1 } } });
  });
  const page = await ctx.newPage();
  const failures = [];
  let current = '';
  page.on('pageerror', err => failures.push({ route: current, error: err.message }));
  for (let i = 0; i < screens.length; i++) {
    const [route, title, note] = screens[i]; current = route;
    if (i === 1) await page.evaluate(() => {
      sessionStorage.setItem('E2E_BYPASS', '1');
      localStorage.setItem('svt_sidebar_collapsed', '0');
    });
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const body = await page.locator('body').innerText();
    if (body.trim().length < 40) failures.push({ route, error: 'Blank or nearly blank screen' });
    if (i === 0) {
      await page.getByRole('button', { name: 'OTP Login' }).click();
      if (!(await page.getByRole('button', { name: 'Send OTP' }).isVisible())) failures.push({ route, error: 'OTP mode not visible' });
      await page.getByRole('button', { name: 'Password Login' }).click();
      if (!(await page.getByRole('button', { name: 'Sign In' }).isVisible())) failures.push({ route, error: 'Password mode not visible' });
    }
    await page.evaluate(({ title, note }) => {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#0b2340;color:white;padding:14px 30px;font:20px Arial,sans-serif;box-shadow:0 -4px 20px #0004';
      const heading = document.createElement('strong'); heading.textContent = title + '  |  DEMO: MOCK DATA'; heading.style.cssText = 'color:#7dd3fc;font-size:17px;display:block;margin-bottom:5px';
      const copy = document.createElement('span'); copy.textContent = note; el.append(heading, copy); document.body.append(el);
    }, { title, note });
    await page.screenshot({ path: path.join(output, `${String(i).padStart(2, '0')}.png`) });
    console.log(`${route}: ${body.trim().length} characters`);
  }
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ mode: 'mocked read-only UI', routes: screens.length, failures }, null, 2));
  console.log(JSON.stringify({ failures }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
