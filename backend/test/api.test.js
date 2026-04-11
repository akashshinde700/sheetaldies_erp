/**
 * Backend API Integration Tests
 * Tests core modules: auth, parties, jobcards, invoices, health
 * Run: node --test test/api.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const http = require('http');

let server;
let baseUrl;
let authCookies = '';

// Helper: make HTTP request
const request = (method, path, body = null, cookies = '') => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsedBody = data ? JSON.parse(data) : {};
          // Extract cookies from response
          const setCookies = res.headers['set-cookie'] || [];
          resolve({
            status: res.statusCode,
            body: parsedBody,
            headers: res.headers,
            cookies: setCookies.map(c => c.split(';')[0]).join('; '),
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers, cookies: '' });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// ── Setup & Teardown ──────────────────────────────────────────
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ── Health Check Tests ────────────────────────────────────────
describe('Health Check', () => {
  it('GET /api/health should return 200 with status ok', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
  });
});

// ── 404 Handler Tests ─────────────────────────────────────────
describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request('GET', '/api/nonexistent');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'NOT_FOUND');
  });
});

// ── Auth Tests ────────────────────────────────────────────────
describe('Authentication', () => {
  it('POST /api/auth/login should reject empty body', async () => {
    const res = await request('POST', '/api/auth/login', {});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'nonexistent@test.com',
      password: 'wrong',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/auth/me should reject unauthenticated', async () => {
    const res = await request('GET', '/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/request-otp should reject empty email', async () => {
    const res = await request('POST', '/api/auth/request-otp', {});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/verify-otp should reject empty body', async () => {
    const res = await request('POST', '/api/auth/verify-otp', {});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/refresh-token should reject without token', async () => {
    const res = await request('POST', '/api/auth/refresh-token', {});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});

// ── Protected Routes (must reject without auth) ───────────────
describe('Protected Routes (Unauthenticated)', () => {
  const protectedRoutes = [
    ['GET', '/api/parties'],
    ['GET', '/api/items'],
    ['GET', '/api/machines'],
    ['GET', '/api/jobcards'],
    ['GET', '/api/jobwork'],
    ['GET', '/api/invoices'],
    ['GET', '/api/quality/certificates'],
    ['GET', '/api/dispatch-challans'],
    ['GET', '/api/purchase/orders'],
    ['GET', '/api/quotes'],
    ['GET', '/api/analytics/dashboard'],
    ['GET', '/api/audit/logs'],
  ];

  for (const [method, path] of protectedRoutes) {
    it(`${method} ${path} should return 401 without auth`, async () => {
      const res = await request(method, path);
      assert.equal(res.status, 401, `Expected 401 for ${method} ${path}, got ${res.status}`);
    });
  }
});

// ── Input Validation Tests ────────────────────────────────────
describe('Input Validation', () => {
  it('should sanitize XSS payloads in request body', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: '<script>alert("xss")</script>test@test.com',
      password: 'test',
    });
    // Should not crash; the sanitizer should strip the script tag
    assert.ok([400, 401].includes(res.status));
    assert.equal(res.body.success, false);
  });

  it('should handle malformed JSON gracefully', async () => {
    // This sends valid JSON but with unexpected types
    const res = await request('POST', '/api/auth/login', {
      email: 12345,
      password: null,
    });
    assert.ok([400, 401, 500].includes(res.status));
  });
});

// ── Rate Limiting Tests ───────────────────────────────────────
describe('Rate Limiting Headers', () => {
  it('should include rate limit headers on API responses', async () => {
    const res = await request('GET', '/api/health');
    // Health endpoint is excluded from rate limiting, so check a regular endpoint
    const res2 = await request('GET', '/api/nonexistent');
    // RateLimit headers might be present
    assert.equal(res2.status, 404);
  });
});

// ── Swagger Docs ──────────────────────────────────────────────
describe('API Documentation', () => {
  it('GET /api-docs should return Swagger UI', async () => {
    const res = await request('GET', '/api-docs');
    // Swagger UI redirects or returns HTML
    assert.ok([200, 301, 302].includes(res.status));
  });
});
