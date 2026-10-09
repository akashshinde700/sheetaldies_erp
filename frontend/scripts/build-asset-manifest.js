/**
 * Lists the built assets for the service worker to precache.
 *
 * Without this the worker could only cache what index.html names — the entry
 * bundles — so opening any lazily loaded route while offline rendered a blank
 * page. The whole build is ~0.7 MB gzipped, which is a fair one-time cost for
 * an app that gets installed once and used every day.
 *
 * Runs as part of `npm run build`.
 */
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, posix } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Everything the browser needs to render the shell. Source maps and the
// manifest itself are deliberately left out.
const WANTED = /\.(?:js|css|woff2?|png|svg|webp|ico)$/i;
const EXCLUDE = new Set(['asset-manifest.json', 'sw.js']);

function walk(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? posix.join(base, name) : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else if (WANTED.test(name) && !EXCLUDE.has(rel)) out.push('/' + rel);
  }
  return out;
}

const assets = walk(DIST).sort();

// A fingerprint of the file list: the worker keys its caches on it, so each
// build gets a fresh cache and the previous one is dropped.
const version = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);

writeFileSync(join(DIST, 'asset-manifest.json'), JSON.stringify({ version, assets }, null, 2));

// Stamp the version into the built worker. Without this sw.js is byte-identical
// between releases, so the browser never installs a new one — the precache
// would keep serving the previous build's files and old entries would pile up
// release after release. Changing one byte is what triggers the update.
const swPath = join(DIST, 'sw.js');
const sw = readFileSync(swPath, 'utf8');
const stamped = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
if (stamped === sw) {
  console.error('build-asset-manifest: could not stamp VERSION into dist/sw.js — the worker would never update.');
  process.exit(1);
}
writeFileSync(swPath, stamped);

const bytes = assets.reduce((n, a) => n + statSync(join(DIST, a.slice(1))).size, 0);
console.log(`asset-manifest.json  ${assets.length} files, ${(bytes / 1048576).toFixed(2)} MB  (version ${version})`);
