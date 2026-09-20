/**
 * Opens every page in a real browser and reports blank pages, uncaught
 * exceptions, failed requests and server errors.
 *
 * Read-only: it navigates and looks. It never saves or deletes anything.
 *
 *   npm run test:ui:walk                 (local, http://localhost:5173)
 *   UI_BASE=https://example.com UI_EMAIL=... UI_PASSWORD=... npm run test:ui:walk
 *
 * Add a route here whenever you add one to App.jsx.
 */
const { reporter, launch, signIn, watch, isRealConsoleError, env } = require('./lib');

const ROUTES = [
  '/',
  '/jobwork/register', '/jobwork', '/jobwork/inward-entry',
  '/jobcards', '/jobcards/new',
  '/manufacturing/planning',
  '/manufacturing/runsheet', '/manufacturing/runsheet/new',
  '/manufacturing/tempering', '/manufacturing/energy',
  '/quality/certificates', '/quality/certificates/new',
  '/quality/rework-data', '/quality/nc-register',
  '/invoices', '/invoices/new',
  '/manufacturing/utilization', '/manufacturing/idle-time', '/manufacturing/plant-losses',
  '/change-password', '/admin/invoice-series',
  '/customer-quotes', '/pending', '/analytics', '/dispatch', '/inventory',
  '/admin/parties', '/admin/party-rates', '/admin/processes', '/admin/heat-treat-specs',
  '/admin/temp-cycle-graphs', '/admin/items', '/admin/machines', '/admin/users', '/admin/audit-logs',
  '/this-route-does-not-exist', // must fall back to the dashboard
];

(async () => {
  const r = reporter();
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  console.log(`Signing in to ${env.base} ...`);
  await signIn(ctx, env.base, env);

  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const seen = watch(page);
    let landed = '';
    let text = '';
    let navError = null;
    try {
      await page.goto(env.base + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2200); // lazy chunk + first fetches
      landed = new URL(page.url()).pathname;
      text = (await page.locator('body').innerText().catch(() => '')).trim();
    } catch (e) {
      navError = String(e.message).split('\n')[0].slice(0, 160);
    }
    await page.close();

    const problems = [];
    if (navError) problems.push(`could not open: ${navError}`);
    else if (text.length < 40 && route !== '/this-route-does-not-exist') problems.push('page is blank');
    if (seen.pageErrors.length) problems.push(`JS error: ${seen.pageErrors[0]}`);
    if (seen.failedReqs.length) problems.push(`request failed: ${seen.failedReqs[0]}`);
    const realConsole = seen.consoleErrors.filter(isRealConsoleError);
    if (realConsole.length) problems.push(`console: ${realConsole[0]}`);

    r.ok(route.padEnd(34) + (landed && landed !== route ? `-> ${landed}` : ''), problems.length === 0, problems.join(' ; '));
  }

  await browser.close();
  process.exit(r.summary() ? 1 : 0);
})().catch((e) => { console.error('CRASH', e.message); process.exit(2); });
