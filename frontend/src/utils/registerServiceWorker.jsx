import toast from 'react-hot-toast';

/**
 * Registers the service worker and, when a new build is waiting, offers the
 * reload rather than taking it.
 *
 * An ERP is full of half-filled forms — an inward being typed, an invoice
 * mid-wizard. Swapping the build out underneath that would lose the lot, so
 * the new worker sits in `waiting` until the operator says go.
 *
 * Dev is deliberately left alone: a worker caching Vite's module graph makes
 * hot reload behave in ways that waste an afternoon.
 */
// Set only when the operator has pressed Reload. The worker calls
// clients.claim() so the very first visit is controlled straight away, and
// that alone fires `controllerchange` — reloading on it unconditionally
// bounced every first-time visitor for no reason.
let updateAccepted = false;

export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Already waiting when the page opened (updated on a previous visit).
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // `controller` is null on the very first install — there is nothing
          // to update from, so say nothing.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            offerUpdate(installing);
          }
        });
      });

      // Check for a new build when the tab comes back into view, so a shift
      // that never closes the app still picks fixes up.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch {
      // A failed registration must never take the app down with it.
    }
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateAccepted || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

function offerUpdate(worker) {
  toast(
    (t) => (
      <span className="flex items-center gap-3">
        A new version is ready.
        <button
          type="button"
          onClick={() => {
            updateAccepted = true;
            toast.dismiss(t.id);
            worker.postMessage('SKIP_WAITING');
          }}
          className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white"
        >
          Reload
        </button>
      </span>
    ),
    { duration: Infinity, id: 'sw-update' },
  );
}
