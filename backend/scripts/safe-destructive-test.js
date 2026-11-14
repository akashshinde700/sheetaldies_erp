'use strict';
// Guardrails only: localhost can itself be a tunnel, and an API can be pointed
// at a different database. The operator must verify isolation independently.
function assertSafeDestructiveTest({ databaseUrl, apiUrl, allowWrites }) {
  if (allowWrites !== '1') throw new Error('Destructive test blocked: set ERP_ALLOW_DESTRUCTIVE_TESTS=1 only for an isolated disposable environment.');
  let db, api;
  try { db = new URL(databaseUrl); } catch { throw new Error('Destructive test blocked: a local DATABASE_URL is required.'); }
  try { api = new URL(apiUrl); } catch { throw new Error('Destructive test blocked: a local API URL is required.'); }
  const local = new Set(['localhost', '127.0.0.1', '[::1]']);
  let databaseName;
  try { databaseName = decodeURIComponent(db.pathname.slice(1)); } catch { databaseName = ''; }
  if (db.protocol !== 'mysql:' || !local.has(db.hostname) || !/^[a-zA-Z0-9_]+_(test|e2e)$/.test(databaseName)) {
    throw new Error('Destructive test blocked: DATABASE_URL must be local MySQL and database name must end in _test or _e2e.');
  }
  if (!['http:', 'https:'].includes(api.protocol) || !local.has(api.hostname) || api.username || api.password) {
    throw new Error('Destructive test blocked: API URL must be local HTTP(S), without URL credentials.');
  }
}
module.exports = { assertSafeDestructiveTest };
