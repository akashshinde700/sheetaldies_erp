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
