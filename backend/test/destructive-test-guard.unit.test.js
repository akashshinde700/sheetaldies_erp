'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertSafeDestructiveTest } = require('../scripts/safe-destructive-test');
const safe = { databaseUrl: 'mysql://user:pass@127.0.0.1:3306/sheetal_e2e', apiUrl: 'http://localhost:5000/api', allowWrites: '1' };

test('destructive tests require explicit consent and local disposable-looking targets', () => {
  assert.doesNotThrow(() => assertSafeDestructiveTest(safe));
  for (const changes of [
    { allowWrites: undefined },
    { databaseUrl: 'mysql://root@localhost/production' },
    { databaseUrl: 'mysql://root@remote.invalid/sheetal_e2e' },
    { databaseUrl: 'mysql://root@localhost.attacker.invalid/sheetal_e2e' },
    { apiUrl: 'http://localhost.attacker.invalid:5000/api' },
    { apiUrl: 'http://user@localhost:5000/api' },
    { databaseUrl: undefined },
  ]) assert.throws(() => assertSafeDestructiveTest({ ...safe, ...changes }), /Destructive test blocked/);
});
