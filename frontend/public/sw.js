/* SVT ERP service worker — hand-written, no build step, no dependencies.
 *
 * What this is for: letting the app be installed and open instantly, and
 * surviving a dropped connection on the shop floor. It is NOT for working
 * offline against stale business data.
 *
 * Three rules it must never break:
 *
 *  1. /api/** is never cached, not even for a second. A cached billing
 *     status or furnace cycle no is a wrong invoice or a duplicate cycle
 *     number — the whole point of those screens is that they are current.
 *     Offline simply fails, and the app already shows that failure.
 *
 *  2. Navigations go to the network first. index.html names the hashed
 *     bundles, so serving it from cache would pin everyone to an old build
 *     and a fix would never reach them. Cache is the fallback, not the
 *     source.
 *
 *  3. Only successful, basic (same-origin), non-range GETs are stored.
 *     Caching a 404, a redirect or a partial response poisons the cache in
 *     ways that are very hard to debug from a plant floor.
 */

const VERSION = 'v1';
const SHELL = `svt-shell-${VERSION}`;   // index.html, for offline navigation
const ASSETS = `svt-assets-${VERSION}`; // hashed bundles, icons, static files
const KEEP = new Set([SHELL, ASSETS]);

/**
 * The CORS middleware puts `Vary: Origin` on every response, including static
 * files. Cache matching honours Vary, and a precache request carries no
 * Origin header while the page's own module-script request (Vite marks them
 * crossorigin) does — so every lookup missed and offline fell over despite a
 * full cache. These are our own files, keyed by URL; Vary has nothing useful
 * to say about them.
 */
const MATCH = { ignoreVary: true };

// Hashed build output: the name changes whenever the content does, so it can
// be served from cache without ever going stale.
const isImmutable = (url) => url.pathname.startsWith('/assets/');

const isStatic = (url) =>
  /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?|webmanifest|txt|xml)$/i.test(url.pathname);

/**
 * Precache the whole build, from the list the build step writes.
 *
 * Caching only what index.html names — the entry bundles — was not enough:
 * every route is a lazily loaded chunk, so opening one offline rendered a
 * blank page, which is the worst way for an app to fail. The full build is
 * about 0.7 MB over the wire, paid once per release.
 *
 * Stale entries from older builds are dropped afterwards, so the cache does
 * not grow with every deploy.
 */
async function precacheBuild() {
  const res = await fetch('/asset-manifest.json', { cache: 'reload' });
  if (!res.ok) throw new Error(`asset-manifest.json: HTTP ${res.status}`);
  const { assets } = await res.json();
  if (!Array.isArray(assets) || !assets.length) throw new Error('empty asset manifest');

  const cache = await caches.open(ASSETS);
  // allSettled: one missing file must not fail the whole install and leave
  // the app with no worker at all.
  await Promise.allSettled(assets.map((u) => cache.add(new Request(u, { cache: 'reload' }))));

  const wanted = new Set(assets);
  const stale = (await cache.keys()).filter((req) => !wanted.has(new URL(req.url).pathname));
  await Promise.all(stale.map((req) => cache.delete(req, MATCH)));
}

self.addEventListener('install', (event) => {
  // Seed the shell and the whole build so the first offline navigation has a
  // working app to show, not a blank page.
  event.waitUntil((async () => {
    try {
      const res = await fetch(new Request('/', { cache: 'reload' }));
      if (res.ok) await (await caches.open(SHELL)).put(new Request('/'), res.clone());
      await precacheBuild();
    } catch {
      // Offline at install time, or a half-deployed server: runtime caching
      // fills in later. Never fail the install over it.
    }
  })());
  // Deliberately no skipWaiting: the page decides when to switch over, so a
  // build never changes under someone mid-form. See registerServiceWorker().
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((n) => (KEEP.has(n) ? null : caches.delete(n))));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  // The page asks for the update once the operator has agreed to reload.
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/** Store a response only if it is actually safe to replay later. */
async function put(cacheName, request, response) {
  if (!response || !response.ok || response.status === 206) return;
  // Only same-origin requests reach here, so 'cors' (Vite marks its module
  // scripts crossorigin) is still our own file — but an opaque response is
  // not something that can be replayed.
  if (response.type !== 'basic' && response.type !== 'cors') return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch { /* quota or opaque — not worth failing the request over */ }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Rule 1 — business data is never served from cache.
  if (url.pathname.startsWith('/api/')) return;
  // Someone else's server (fonts, CDNs): let the browser's own HTTP cache do it.
  if (url.origin !== self.location.origin) return;
  // The worker and the manifest must always come from the network, or an
  // update could never land.
  if (url.pathname === '/sw.js'
      || url.pathname === '/manifest.webmanifest'
      || url.pathname === '/asset-manifest.json') return;

  // Rule 2 — navigations: network first, cache only as a fallback.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        await put(SHELL, new Request('/'), fresh);
        return fresh;
      } catch {
        const cached = await caches.match('/', { cacheName: SHELL, ...MATCH })
          || await caches.match('/', MATCH);
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isImmutable(url)) {
    // Content-hashed: whatever is in the cache under this name is correct.
    event.respondWith((async () => {
      const hit = await caches.match(req, MATCH);
      if (hit) return hit;
      const fresh = await fetch(req);
      await put(ASSETS, req, fresh);
      return fresh;
    })());
    return;
  }

  if (isStatic(url) || url.pathname.startsWith('/uploads/')) {
    // Stale-while-revalidate: instant from cache, refreshed in the background.
    event.respondWith((async () => {
      const hit = await caches.match(req, MATCH);
      const net = fetch(req)
        .then((res) => { put(ASSETS, req, res); return res; })
        .catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});
