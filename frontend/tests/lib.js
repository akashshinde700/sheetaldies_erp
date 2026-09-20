/**
 * Shared helpers for the browser tests.
 *
 * These drive a real Chrome (the one already installed on the machine — no
 * extra browser download) so they catch what a build or an API call cannot:
 * blank pages, uncaught exceptions, a download that never arrives.
 */
const path = require('path');
const { chromium } = require('playwright');

const BACKEND = path.resolve(__dirname, '..', '..', 'backend');

/** Require a package out of the backend's node_modules (jwt, prisma, dotenv). */
function fromBackend(pkg) {
  return require(path.join(BACKEND, 'node_modules', pkg));
}

/** A tiny pass/fail reporter — no test framework needed. */
function reporter() {
  let pass = 0;
  let fail = 0;
  return {
    ok(name, condition, detail = '') {
      condition ? (pass += 1) : (fail += 1);
      console.log(`${condition ? 'PASS ' : 'FAIL '}${name}${condition ? '' : `   <- ${detail}`}`);
    },
    summary() {
      console.log(`\n${pass} passed, ${fail} failed`);
      return fail;
    },
  };
}

async function launch() {
  return chromium.launch({ channel: 'chrome' });
}

/**
 * Signs in. Against localhost it mints a token from the backend's own
 * JWT_SECRET (no password needed); anywhere else it fills in the real login
 * form with credentials taken from the environment.
 */
async function signIn(ctx, baseUrl, { email, password } = {}) {
  const host = new URL(baseUrl).hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  if (isLocal && !email) {
    fromBackend('dotenv').config({ path: path.join(BACKEND, '.env') });
    if (!process.env.JWT_SECRET) throw new Error('backend/.env has no JWT_SECRET — cannot sign in locally.');
    const token = fromBackend('jsonwebtoken').sign(
      { id: 1, email: 'admin@local', role: 'ADMIN', name: 'Administrator' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' },
    );
    await ctx.addCookies([{ name: 'accessToken', value: token, domain: host, path: '/' }]);
    return 'token';
  }

  if (!email || !password) {
    throw new Error('Set UI_EMAIL and UI_PASSWORD to sign in to a remote site.');
  }
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  const landed = new URL(page.url()).pathname;
  await page.close();
  if (/\/login/.test(landed)) throw new Error('Login failed — check UI_EMAIL / UI_PASSWORD.');
  return 'form';
}

/** Collects console errors, uncaught exceptions, failed requests and 5xx responses. */
function watch(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedReqs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 300)));
  page.on('requestfailed', (r) => failedReqs.push(`${r.method()} ${r.url().slice(0, 120)}`));
  page.on('response', (r) => { if (r.status() >= 500) failedReqs.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`); });
  return { consoleErrors, pageErrors, failedReqs };
}

/**
 * A request the app itself cancels (React StrictMode double-mounts in dev, or
 * a component unmounts mid-fetch) is normal and not a failure.
 */
const isRealConsoleError = (text) => !/canceled|AbortError|ERR /i.test(text);

const env = {
  base: process.env.UI_BASE || 'http://localhost:5173',
  email: process.env.UI_EMAIL,
  password: process.env.UI_PASSWORD,
};

module.exports = { fromBackend, reporter, launch, signIn, watch, isRealConsoleError, env, BACKEND };
