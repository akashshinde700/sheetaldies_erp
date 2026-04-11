const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const {
  JOB_CARD_STATUSES,
  JOBWORK_STATUSES,
  jobCardStatusBody,
  jobworkStatusBody,
} = require('../src/validation/schemas');
const authMiddleware = require('../src/middleware/auth');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

test('JOB_CARD_STATUSES includes core workflow values', () => {
  assert.ok(JOB_CARD_STATUSES.includes('CREATED'));
  assert.ok(JOB_CARD_STATUSES.includes('COMPLETED'));
});

test('JOBWORK_STATUSES matches challan lifecycle', () => {
  assert.ok(JOBWORK_STATUSES.includes('DRAFT'));
  assert.ok(JOBWORK_STATUSES.includes('COMPLETED'));
});

test('jobCardStatusBody accepts valid status', () => {
  const { error } = jobCardStatusBody.validate({ status: 'IN_PROGRESS' });
  assert.strictEqual(error, undefined);
});

test('jobCardStatusBody rejects invalid status', () => {
  const { error } = jobCardStatusBody.validate({ status: 'INVALID' });
  assert.ok(error);
});

const { parseCookies } = require('../src/utils/cookies');
const { mapPrismaError } = require('../src/middleware/errorHandler');
const { softDelete } = require('../src/utils/softDelete');

test('parseCookies parses cookie header correctly', () => {
  const cookies = parseCookies('accessToken=abc123; refreshToken=xyz456');
  assert.strictEqual(cookies.accessToken, 'abc123');
  assert.strictEqual(cookies.refreshToken, 'xyz456');
});

test('softDelete helper rejects invalid ids', async () => {
  await assert.rejects(
    () => softDelete({ update: () => Promise.resolve() }, null),
    { message: 'Invalid ID for soft delete' }
  );
});

test('mapPrismaError maps P2002 gstin error to ERR_DUPLICATE_GSTIN', () => {
  const prismaErr = { code: 'P2002', meta: { target: ['gstin'] } };
  const mapped = mapPrismaError(prismaErr);
  assert.strictEqual(mapped.code, 'ERR_DUPLICATE_GSTIN');
});

test('auth middleware accepts token from cookie header', () => {
  const token = jwt.sign({ id: 99, email: 'test@example.com', role: 'ADMIN', name: 'Test User' }, process.env.JWT_SECRET);
  const req = { headers: { cookie: `accessToken=${token}` } };
  const res = {};
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  authMiddleware(req, res, next);
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.id, 99);
  assert.strictEqual(req.user.email, 'test@example.com');
});

test('auth middleware rejects missing authentication token', () => {
  const req = { headers: {} };
  let statusCode = null;
  let jsonResponse = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      jsonResponse = payload;
      return payload;
    },
  };

  authMiddleware(req, res, () => {});
  assert.strictEqual(statusCode, 401);
  assert.strictEqual(jsonResponse.success, false);
  assert.ok(jsonResponse.message.includes('Access denied'));
});

test('jobworkStatusBody requires status only', () => {
  const { error, value } = jobworkStatusBody.validate({ status: 'SENT' });
  assert.strictEqual(error, undefined);
  assert.strictEqual(value.status, 'SENT');
});
