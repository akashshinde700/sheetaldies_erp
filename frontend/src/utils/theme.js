// App theme: 'light' | 'dark' | 'system'. Persisted in localStorage; the
// actual <html class="dark"> toggle also runs from an inline script in
// index.html so there is no flash before React mounts.

const KEY = 'svt_theme';

export const getStoredTheme = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : 'system';
  } catch {
    return 'system';
  }
};

export const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const resolveDark = (theme = getStoredTheme()) =>
  theme === 'dark' || (theme === 'system' && systemPrefersDark());

export const applyTheme = (theme = getStoredTheme()) => {
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', dark ? 'dark' : 'light');
};

export const setTheme = (theme) => {
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch { /* ignore */ }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('svt-theme-change', { detail: { theme } }));
};

// light → dark → system → light
export const cycleTheme = () => {
  const order = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(getStoredTheme()) + 1) % order.length];
  setTheme(next);
  return next;
};

// Plain 2-state flip based on what's actually showing right now.
export const toggleDark = () => {
  const next = resolveDark() ? 'light' : 'dark';
  setTheme(next);
  return next;
};

// Keep 'system' choice live when the OS flips.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  });
}

// Some code paths (print helpers, route swaps, 3rd-party widgets) have been
// seen to strip the class off <html>, which silently drops dark mode. Watch
// for that and put it back so the theme never "falls out" on its own.
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined' && document.documentElement) {
  let guard = false;
  const obs = new MutationObserver(() => {
    if (guard) return;
    const shouldDark = resolveDark();
    const isDark = document.documentElement.classList.contains('dark');
    if (shouldDark === isDark) return;
    guard = true;
    document.documentElement.classList.toggle('dark', shouldDark);
    guard = false;
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  // And re-assert once the tab regains focus / becomes visible.
  window.addEventListener('visibilitychange', () => applyTheme());
  window.addEventListener('focus', () => applyTheme());
}
