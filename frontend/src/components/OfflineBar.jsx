import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * A plain statement that the server is unreachable.
 *
 * Installed as an app, the shell loads from cache and keeps working — but
 * every screen here needs the API, so without a connection the app can only
 * bounce you to a login that cannot succeed. Saying so outright is kinder
 * than letting someone retype their password at a dead form.
 *
 * `navigator.onLine` only knows whether there is a network interface, not
 * whether the server answers, so it is treated as a hint: false is reliable,
 * true is not.
 */
export default function OfflineBar() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);

  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    return () => {
      window.removeEventListener('offline', down);
      window.removeEventListener('online', up);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="no-print fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-2
                 bg-amber-500 px-3 py-1.5 text-[12px] font-semibold text-amber-950
                 pt-[max(0.375rem,env(safe-area-inset-top))]"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You are offline — the app is running from your device, but nothing can be saved or loaded until the connection is back.
    </div>
  );
}
