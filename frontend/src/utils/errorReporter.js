/**
 * Browser errors ko server tak pahunchata hai.
 *
 * Pehle browser me kuch bhi toote to sirf console me jata tha — jo user ke
 * laptop pe hota hai, kisi ko dikhta nahi. Ab wo /api/errors me record hota hai
 * aur Admin > Error Log me dikhta hai.
 *
 * Optional Sentry: VITE_SENTRY_DSN set ho aur @sentry/react installed ho to wo
 * bhi chalu ho jayega. Warna sab kuch apne hi server pe rehta hai.
 */

let sentry = null;

// Ek hi error loop me hazaar baar aa sakta hai; server ko baar-baar mat maaro.
const seen = new Map();
const DEDUPE_MS = 60_000;
const MAX_PER_SESSION = 25;
let sentCount = 0;

const shouldSend = (key) => {
  if (sentCount >= MAX_PER_SESSION) return false;
  const now = Date.now();
  const last = seen.get(key);
  if (last && now - last < DEDUPE_MS) return false;
  seen.set(key, now);
  return true;
};

export const reportError = (error, meta = {}) => {
  try {
    const message = String(error?.message || error || 'Unknown error').slice(0, 2000);
    const stack = error?.stack ? String(error.stack).slice(0, 8000) : undefined;
    const key = `${message}|${(stack || '').split('\n')[1] || ''}`;
    if (!shouldSend(key)) return;
    sentCount++;

    // fetch, axios nahi: agar api client hi toota ho to bhi report jaani chahiye,
    // aur interceptors is call pe nahi chalne chahiye.
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,          // page band ho raha ho to bhi chali jaye
      body: JSON.stringify({
        message, stack,
        url: window.location.href,
        level: meta.level || 'error',
        meta: { ...meta, userAgent: navigator.userAgent },
      }),
    }).catch(() => { /* report bhejne me fail — chup rehna hi theek hai */ });

    if (sentry) sentry.captureException(error, { extra: meta });
  } catch { /* reporter khud kabhi crash na kare */ }
};

/** App start pe ek baar. Wo errors pakadta hai jo React ke bahar hote hain. */
export const initErrorReporting = async () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    try {
      // Package ka naam runtime pe joda gaya hai. Sentry optional dependency
      // hai; agar yahan literal string hoti to Vite build ke waqt hi usse
      // resolve karne ki koshish karta aur "failed to resolve" pe build gir
      // jaati — chahe wo package kabhi chahiye hi na ho.
      const pkg = ['@sentry', 'react'].join('/');
      const mod = await import(/* @vite-ignore */ pkg);
      mod.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0 });
      sentry = mod;
    } catch {
      console.warn('[errorReporter] VITE_SENTRY_DSN set hai par @sentry/react installed nahi — errors sirf /api/errors me jayenge');
    }
  }

  window.addEventListener('error', (e) => {
    // <img>/<script> load fail hone pe bhi ye event aata hai, par usme error
    // object nahi hota — usse chhod do.
    if (!e.error) return;
    reportError(e.error, { kind: 'window.onerror' });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    // Cancelled axios calls (route badal gaya) asli error nahi hain.
    if (r?.name === 'CanceledError' || r?.code === 'ERR_CANCELED') return;
    reportError(r instanceof Error ? r : new Error(String(r)), { kind: 'unhandledrejection' });
  });
};
