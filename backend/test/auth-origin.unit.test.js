'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const auth = require('../src/middleware/auth');
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'unit-test-secret-not-for-deployment';
process.env.CORS_ORIGINS = 'https://erp.example.com,http://localhost:5173';
const token = jwt.sign({ id: 1, role: 'OPERATOR' }, process.env.JWT_SECRET);
function check({ origin, referer, requestId, method = 'POST', bearer = false }) {
  let next = false;
  const req = { method, headers: { ...(bearer ? { authorization: `Bearer ${token}` } : { cookie: `accessToken=${token}` }), ...(origin ? { origin } : {}), ...(referer ? { referer } : {}), ...(requestId ? { 'x-request-id': requestId } : {}) } };
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  auth(req, res, () => { next = true; });
  return { next, status: res.code };
}
test('accepts allowed origin and same-origin referer path', () => {
  assert.equal(check({ origin: 'https://erp.example.com' }).next, true);
  assert.equal(check({ referer: 'https://erp.example.com/invoices/1' }).next, true);
});
test('rejects origins merely containing an allowlisted string', () => {
  for (const origin of ['https://erp.example.com.attacker.invalid', 'https://attacker.invalid/https://erp.example.com', 'http://localhost:5173.attacker.invalid', 'null', 'not-a-url']) {
    assert.equal(check({ origin }).status, 403, origin);
    assert.equal(check({ origin, requestId: 'present' }).status, 403, origin);
  }
});
test('preserves the documented request-id and bearer flows', () => {
  assert.equal(check({ requestId: 'present' }).next, true);
  assert.equal(check({}).status, 403);
  assert.equal(check({ method: 'GET' }).next, true);
  assert.equal(check({ bearer: true }).next, true);
});
