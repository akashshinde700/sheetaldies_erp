/**
 * Read-only check of a deployed site: signs in through the real login form,
 * opens each main page and confirms the tempering board lists the plant's
 * five tempering furnaces.
 *
 * It only navigates and reads — it never saves, deletes or creates anything,
 * so it is safe to run against production.
 *
 *   UI_BASE=https://www.codeprana.com UI_EMAIL=... UI_PASSWORD=... npm run test:ui:live
 */
const { reporter, launch, signIn, watch, isRealConsoleError, env } = require('./lib');

const PAGES = [
  ['Dashboard', '/'],
  ['Inwards', '/jobwork/register'],
  ['Job Cards', '/jobcards'],
  ['Daily Planning', '/manufacturing/planning'],
  ['VHT Runsheet', '/manufacturing/runsheet'],
  ['Tempering Plan', '/manufacturing/tempering'],
  ['Energy Log', '/manufacturing/energy'],
  ['Certificates', '/quality/certificates'],
  ['Rework Data', '/quality/rework-data'],
  ['NC Register', '/quality/nc-register'],
  ['Invoices', '/invoices'],
  ['Furnace Utilisation', '/manufacturing/utilization'],
  ['Monthly Idle Time', '/manufacturing/idle-time'],
  ['Plant Losses', '/manufacturing/plant-losses'],
  ['Pending', '/pending'],
  ['Party Rates', '/admin/party-rates'],
  ['Machines', '/admin/machines'],
];

const TEMPERING_FURNACES = ['TFR-01', 'TFR-02', 'TFR-03', 'VTF', 'TF-02'];

(async () => {
  if (!env.email || !env.password) {
    console.error('Set UI_EMAIL and UI_PASSWORD (and UI_BASE) before running this.');
    process.exit(2);
  }
  const r = reporter();
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });

  console.log(`Signing in to ${env.base} ...`);
  await signIn(ctx, env.base, env);
  r.ok('Login through the real form works', true);

  const page = await ctx.newPage();
  const seen = watch(page);

  for (const [name, url] of PAGES) {
    await page.goto(env.base + url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    const text = (await page.locator('body').innerText().catch(() => '')).trim();
    const landed = new URL(page.url()).pathname;
    r.ok(`${name.padEnd(20)} renders`, text.length > 80 && landed === url, `length ${text.length}, landed on ${landed}`);
  }

  await page.goto(`${env.base}/manufacturing/tempering`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const board = await page.locator('body').innerText();
  for (const furnace of TEMPERING_FURNACES) {
    r.ok(`Tempering board lists ${furnace}`, new RegExp(`\\b${furnace.replace('-', '\\-')}\\b`).test(board));
  }
  r.ok('Hardening furnaces stay off the tempering board', !/VPT-01|MUFFLE|SUB ZERO/.test(board));

  r.ok('No uncaught JS errors', seen.pageErrors.length === 0, seen.pageErrors[0] || '');
  r.ok('No failed or 5xx requests', seen.failedReqs.length === 0, seen.failedReqs[0] || '');
  const realConsole = seen.consoleErrors.filter(isRealConsoleError);
  r.ok('No console errors', realConsole.length === 0, realConsole[0] || '');

  await browser.close();
  process.exit(r.summary() ? 1 : 0);
})().catch((e) => { console.error('CRASH', e.message); process.exit(2); });
