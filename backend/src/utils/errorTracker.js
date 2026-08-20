/**
 * Error tracking — errors ko DB me rakhta hai aur (agar DSN set ho to) Sentry
 * ko bhi bhejta hai.
 *
 * Sentry optional hai: SENTRY_DSN khali chhod do to sab kuch apne server pe hi
 * rehta hai, koi data bahar nahi jata. DSN daalte hi wo apne aap chalu ho jata
 * hai — package install hai to.
 */
const crypto = require('crypto');
const prisma = require('./prisma');

// ── Sentry (optional) ─────────────────────────────────────────
let sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    // Naam runtime pe joda gaya hai: Sentry optional dependency hai, aur
    // bundlers/linters literal require ko missing module maan kar shor
    // machate hain.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    sentry = require(['@sentry', 'node'].join('/'));
    sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0,
    });
    console.log('[errorTracker] Sentry on');
  } catch {
    console.warn('[errorTracker] SENTRY_DSN set hai par @sentry/node installed nahi — sirf DB logging chalegi');
    sentry = null;
  }
}

// Same error baar-baar aaye to nayi row nahi banti, purani ka count badhta hai.
// Stack ki pehli 3 lines hi lete hain — line numbers ke alawa baaki sthir rehta hai.
const fingerprintOf = ({ source, message, stack, url }) => {
  const head = String(stack || '').split('\n').slice(0, 3).join('|');
  return crypto.createHash('sha256')
    .update(`${source}|${message}|${head}|${url || ''}`)
    .digest('hex')
    .slice(0, 64);
};

const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

// Ek hi error ke dobara aane pe count badhane ki window.
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Error record karo. Kabhi throw nahi karta — tracking khud fail hokar asli
 * request ko nahi giraana chahiye.
 */
const capture = async (err, ctx = {}) => {
  try {
    const message = clip(err?.message || String(err) || 'Unknown error', 2000);
    const source = ctx.source || 'backend';
    const stack = clip(err?.stack, 8000);
    const url = clip(ctx.url, 500);
    const fingerprint = fingerprintOf({ source, message, stack, url });

    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const existing = await prisma.errorLog.findFirst({
      where: { fingerprint, lastSeenAt: { gte: since }, resolved: false },
      select: { id: true },
    });

    if (existing) {
      await prisma.errorLog.update({
        where: { id: existing.id },
        data: { count: { increment: 1 }, lastSeenAt: new Date() },
      });
    } else {
      await prisma.errorLog.create({
        data: {
          source,
          level: ctx.level || 'error',
          message,
          stack,
          code: clip(ctx.code || err?.code, 60),
          statusCode: ctx.statusCode ?? null,
          method: clip(ctx.method, 10),
          url,
          userAgent: clip(ctx.userAgent, 400),
          userId: ctx.userId ?? null,
          meta: ctx.meta ?? undefined,
          fingerprint,
        },
      });
    }

    if (sentry) {
      sentry.captureException(err, { extra: { ...ctx, fingerprint } });
    }
  } catch (e) {
    // Ye jaan-boojh kar chup hai: agar DB hi down hai to tracking bhi fail
    // hogi, aur us waqt aur exception uchhalna sirf nuqsaan karega.
    console.error('[errorTracker] error record nahi kar paya:', e.message);
  }
};

module.exports = { capture, sentry, fingerprintOf };
