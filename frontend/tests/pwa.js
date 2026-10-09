/**
 * Checks the app really is installable, and — more importantly — that the
 * service worker never caches business data.
 *
 * Must run against a PRODUCTION build served the way the server serves it,
 * because the worker only registers in prod and the MIME types come from
 * express.static:
 *
 *   cd frontend && npm run build
 *   rm -rf ../backend/public && cp -r dist ../backend/public
 *   cd ../backend && npm start
 *   cd ../frontend && npm run test:pwa
 *
 * Read-only against the app's data: it navigates and inspects caches.
 */
const { reporter, launch, signIn, isRealConsoleError } = require('./lib');

const BASE = process.env.PWA_BASE || 'http://localhost:5000';

(async () => {
  const r = reporter();
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await signIn(ctx, BASE, {});
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240)); });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  // 1. The worker registers and takes control.
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    return reg ? (reg.active ? 'active' : 'registered') : 'none';
  });
  r.ok('Service worker becomes active', swState === 'active', swState);

  // 2. The manifest is valid and its icons actually exist.
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return { error: 'no <link rel="manifest">' };
    const res = await fetch(link.href);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const m = await res.json();
    const icons = [];
    for (const i of m.icons || []) {
      const ir = await fetch(i.src, { method: 'GET' });
      icons.push({ src: i.src, ok: ir.ok, type: ir.headers.get('content-type') });
    }
    return { m, icons };
  });
  r.ok('Manifest loads and parses', !manifest.error, manifest.error || '');
  const m = manifest.m || {};
  r.ok('Manifest is installable (name, start_url, standalone)',
    Boolean(m.name && m.start_url && m.display === 'standalone'),
    JSON.stringify({ name: m.name, start_url: m.start_url, display: m.display }));
  r.ok('Has a 192 and a 512 icon',
    (m.icons || []).some((i) => i.sizes === '192x192') && (m.icons || []).some((i) => i.sizes === '512x512'));
  r.ok('Has a maskable icon so Android does not crop it',
    (m.icons || []).some((i) => String(i.purpose || '').includes('maskable')));
  r.ok('Every icon actually downloads as a PNG',
    (manifest.icons || []).every((i) => i.ok && /image\/png/.test(i.type || '')),
    JSON.stringify(manifest.icons));

  // 3. The rule that matters: business data is never cached.
  await page.goto(BASE + '/jobcards', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const cached = await page.evaluate(async () => {
    const out = { api: [], bundles: [], shell: false, names: await caches.keys() };
    for (const n of out.names) {
      for (const req of await (await caches.open(n)).keys()) {
        const path = new URL(req.url).pathname;
        if (path.startsWith('/api/')) out.api.push(path);
        else if (path.startsWith('/assets/')) out.bundles.push(path);
        else if (path === '/') out.shell = true;
      }
    }
    return out;
  });
  r.ok('No /api response is ever cached', cached.api.length === 0, cached.api.join(', '));
  r.ok('The shell is cached', cached.shell, cached.names.join(', '));
  // Counting "anything not /api" would pass on the shell entry alone, which is
  // exactly how an empty asset cache slipped through the first time.
  r.ok('The entry bundles are cached', cached.bundles.length >= 2,
    `${cached.bundles.length} bundle(s): ${cached.bundles.slice(0, 3).join(', ')}`);

  // 4. Offline: the shell still renders instead of the browser error page.
  await ctx.setOffline(true);
  await page.goto(BASE + '/pending', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2500);
  const offlineText = (await page.locator('body').innerText().catch(() => '')).trim();
  // Not just "some bytes": the React app must actually have booted, which
  // means its JavaScript came out of the cache too.
  r.ok('Offline still boots the app, not a blank page',
    /SVT ERP/i.test(offlineText) && offlineText.length > 60,
    `${offlineText.length} chars: ${offlineText.slice(0, 80)}`);
  r.ok('Offline is stated plainly, not left to a dead login form',
    /You are offline/i.test(offlineText), offlineText.slice(0, 100));
  await ctx.setOffline(false);

  const real = consoleErrors.filter(isRealConsoleError).filter((t) => !/Failed to fetch|NetworkError|net::ERR/i.test(t));
  r.ok('No console or CSP errors', real.length === 0, real[0] || '');

  await browser.close();
  process.exit(r.summary() ? 1 : 0);
})().catch((e) => { console.error('CRASH', e.message); process.exit(2); });
