// Read-only UI smoke checks. API responses are synthetic; these are NOT business E2E tests.
import { test, expect } from 'playwright/test';

const routes = [
  '/', '/jobwork/register', '/jobwork/inward-entry', '/jobcards', '/jobcards/new',
  '/manufacturing/planning', '/manufacturing/runsheet', '/manufacturing/runsheet/new',
  '/manufacturing/tempering', '/manufacturing/energy', '/manufacturing/utilization',
  '/manufacturing/idle-time', '/manufacturing/plant-losses', '/quality/certificates',
  '/quality/certificates/new', '/quality/rework-data', '/quality/nc-register', '/invoices',
  '/invoices/new', '/customer-quotes', '/customer-quotes/new', '/dispatch', '/dispatch/new',
  '/inventory', '/purchase/inventory', '/pending', '/analytics', '/analytics/advanced',
  '/change-password', '/admin/parties', '/admin/parties/new', '/admin/party-rates',
  '/admin/processes', '/admin/heat-treat-specs', '/admin/temp-cycle-graphs', '/admin/items',
  '/admin/machines', '/admin/invoice-series', '/admin/users', '/admin/audit-logs',
  '/manufacturing/utilization/print', '/manufacturing/utilization/print-pack',
  '/manufacturing/idle-time/print', '/manufacturing/plant-losses/print',
  '/quality/rework-data/print', '/quality/nc-register/print', '/quality/print-pack',
];

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fulfill({ status: 403, json: { message: 'Mock UI test: writes disabled' } });
    const p = new URL(req.url()).pathname;
    if (p.endsWith('/auth/me')) return route.fulfill({ status: 401, json: { message: 'Unauthenticated' } });
    let data = [];
    if (p.endsWith('/analytics/overview')) data = { revenue: {}, jobs: {}, quality: {}, invoices: {} };
    else if (p.endsWith('/analytics/pending-items')) data = { summary: {} };
    else if (p.endsWith('/jobcards/stats')) data = {};
    else if (p.endsWith('/quality/rework-entries')) data = { entries: [], totals: {}, causes: [], correctiveActions: [] };
    else if (p.endsWith('/parties/location-suggestions')) data = { cities: [], states: [], pinCodes: [] };
    else if (p.endsWith('/audit/dashboard')) data = { todayActions: 0, monthActions: 0, topUsers: [], topResources: [], actionBreakdown: [], last7Days: [] };
    return route.fulfill({ json: { success: true, data, pagination: { total: 0, page: 1, totalPages: 1 } } });
  });
}

test.describe('Mocked read-only screen smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => sessionStorage.setItem('E2E_BYPASS', '1'));
  });
  for (const route of routes) {
    test(`renders ${route}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(route);
      expect(new URL(page.url()).pathname).toBe(route);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('main')).not.toBeEmpty();
      await page.waitForTimeout(500);
      await expect(page.getByText('Oops! Something went wrong')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
  test('inward: add a row without submitting', async ({ page }) => {
    await page.goto('/jobwork/inward-entry');
    await page.getByRole('button', { name: 'Add first item' }).click();
    await expect(page.getByPlaceholder('Part name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Inward' })).toBeVisible();
    await page.getByRole('button', { name: 'Create Inward' }).click();
    await expect(page.getByText('Company Name is required')).toBeVisible();
    await expect(page).toHaveURL(/\/jobwork\/inward-entry$/);
  });
  test('dispatch form does not discard a description-only item', async ({ page }) => {
    await page.route('**/api/parties', route => route.fulfill({ json: { success: true, data: [{ id: 1, name: 'Sender' }, { id: 2, name: 'Recipient' }] } }));
    await page.goto('/dispatch/new');
    await page.getByRole('combobox', { name: 'Select from party' }).click();
    await page.getByRole('option', { name: 'Sender' }).click();
    await page.getByRole('combobox', { name: 'Select to party' }).click();
    await page.getByRole('option', { name: 'Recipient' }).click();
    await page.getByPlaceholder('Part / item description').fill('Description only');
    await page.getByPlaceholder('0', { exact: true }).fill('1.25');
    await page.getByRole('button', { name: 'Create challan' }).click();
    await expect(page.getByText('Select an Item from the master list for row 1.')).toBeVisible();
    await expect(page).toHaveURL(/\/dispatch\/new$/);
    await page.getByRole('combobox').filter({ hasText: 'DRAFT' }).click();
    await expect(page.getByRole('option', { name: 'SENT' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'COMPLETED' })).toHaveCount(0);
  });
  test('mobile menu navigates to Inwards', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Inwards' }).click();
    await expect(page).toHaveURL(/\/jobwork\/register$/);
  });
  test('desktop sidebar navigation and unknown route fallback', async ({ page }) => {
    await page.goto('/');
    // Icon-only navigation must retain meaningful screen-reader names.
    await expect(page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Inwards', exact: true })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeAttached();
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Inwards' }).click();
    await expect(page).toHaveURL(/\/jobwork\/register$/);
    await page.goto('/route-that-does-not-exist');
    await expect(page).toHaveURL(/\/$/);
  });
  test('local icon font loads without Google Fonts', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.goto('/');
    const navIcon = page.getByRole('navigation', { name: 'Main menu' }).locator('.material-symbols-outlined').first();
    await expect(navIcon).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px "Material Symbols Outlined"'))).toBe(true);
    const font = await navIcon.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font).toContain('Material Symbols Outlined');
    // Utility sizes still override the default 24px font size.
    expect(await navIcon.evaluate(el => getComputedStyle(el).fontSize)).toBe('18px');
  });
  for (const [path, endpoint, button, marker] of [
    ['/jobwork/987/print', '/jobwork/987', 'Print Register', 'DEMO-INW-987'],
    ['/jobcards/987/print', '/jobcards/987', 'Print Both', 'DEMO-JC-987'],
    ['/manufacturing/runsheet/987/print', '/manufacturing/runsheets/987', 'Print', 'DEMO-CYCLE-987'],
    ['/quality/certificates/987/print', '/quality/certificates/987', 'Print / Save PDF', 'DEMO-CERT-987'],
    ['/invoices/987/print', '/invoices/987', 'Print / Save PDF', 'DEMO-INV-987'],
    ['/dispatch/987/print', '/dispatch-challans/987', 'Print / Save PDF', 'DEMO-INW-987'],
  ]) {
    test(`mocked populated print ${path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => { window.print = () => { window.__printed = true; }; });
      const demo = {
        id: 987, challanNo: 'DEMO-INW-987', inwardNo: 'DEMO-INW-987', jobCardNo: 'DEMO-JC-987',
        cycleNo: 'DEMO-CYCLE-987', runsheetNumber: 'DEMO-CYCLE-987', certNo: 'DEMO-CERT-987', invoiceNo: 'DEMO-INV-987',
        challanDate: '2026-11-01', invoiceDate: '2026-11-01', dueDate: '2026-11-05',
        dispatchNo: 'DEMO-DC-987', challanNumber: 'DEMO-DC-987',
        customer: { name: 'Demo Customer' }, fromParty: { name: 'Demo Customer' }, toParty: { name: 'Demo Processor' },
        jobCard: { jobCardNo: 'DEMO-JC-987', customer: { name: 'Demo Customer' }, challanItemLinks: [] },
        items: [{ id: 123, description: 'Demo part', quantity: 2, weight: 10, weightKg: 10, rate: 20, amount: 200 }],
        challanItemLinks: [], inspection: {}, heatProcesses: [], subtotal: 200, grandTotal: 236,
      };
      await page.route(`**/api${endpoint}`, route => route.fulfill({ json: { success: true, data: demo } }));
      await page.goto(path);
      await expect(page.getByRole('button', { name: button, exact: true })).toBeVisible();
      await expect(page.locator('main')).toContainText(marker);
      await page.getByRole('button', { name: button, exact: true }).click();
      await expect.poll(() => page.evaluate(() => window.__printed || false)).toBe(true);
      await page.emulateMedia({ media: 'print' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
      expect(pdf.length).toBeGreaterThan(3000);
      expect(errors).toEqual([]);
    });
  }
  test('quotation print reports a failed request and offers a way back', async ({ page }) => {
    await page.route('**/api/customer-quotes/987', route => route.fulfill({ status: 404, json: { message: 'Not found' } }));
    await page.goto('/customer-quotes/987/print');
    await expect(page.getByRole('alert')).toContainText('Unable to load quotation');
    await expect(page.getByRole('link', { name: 'Back to quotations' })).toHaveAttribute('href', '/customer-quotes');
  });
  test('quotation print has an explicit print button for a mocked quote', async ({ page }) => {
    await page.addInitScript(() => { window.print = () => { window.__printCount = (window.__printCount || 0) + 1; }; });
    await page.route('**/api/customer-quotes/987', route => route.fulfill({ json: { success: true, data: { quoteNo: 'DEMO-987', customer: { name: 'Demo Customer' }, items: [] } } }));
    await page.goto('/customer-quotes/987/print');
    await expect(page.getByText('DEMO-987')).toBeVisible();
    await page.getByRole('button', { name: 'Print / Save PDF' }).click();
    expect(await page.evaluate(() => window.__printCount)).toBeGreaterThan(0);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(3000);
  });
  test('NC register print button and PDF rendering with empty mock data', async ({ page }) => {
    await page.addInitScript(() => { window.print = () => { window.__printCalled = true; }; });
    await page.goto('/quality/nc-register/print');
    await expect(page.getByText('INHOUSE NON CONFORMANCE (NC) REGISTER')).toBeVisible();
    await page.getByRole('button', { name: 'Print', exact: true }).click();
    expect(await page.evaluate(() => window.__printCalled)).toBe(true);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'Print', exact: true })).toBeHidden();
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(3000);
  });
});

test('login switches tabs and prevents duplicate OTP requests while pending', async ({ page }) => {
  await mockApi(page);
  let requests = 0;
  // More specific handler registered last so it takes precedence over the write blocker.
  await page.route('**/api/auth/request-otp', async route => {
    requests++;
    await new Promise(resolve => setTimeout(resolve, 800));
    await route.fulfill({ json: { success: true } });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'OTP Login' }).click();
  await page.locator('#otp-email').fill('demo@example.com');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await expect(page.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Password Login' })).toBeDisabled();
  await expect(page.locator('#login-otp')).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Password Login' }).click();
  await expect(page.locator('#login-password')).toBeVisible();
});
