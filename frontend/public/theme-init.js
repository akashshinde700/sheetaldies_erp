// Set the theme class before first paint — no flash.
// Kept as a separate file (not inline in index.html) so it passes the
// backend's Content-Security-Policy `script-src 'self'`.
(function () {
  try {
    var t = localStorage.getItem('svt_theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
