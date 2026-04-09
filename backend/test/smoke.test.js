const test = require('node:test');
const assert = require('node:assert');
const {
  JOB_CARD_STATUSES,
  JOBWORK_STATUSES,
  jobCardStatusBody,
  jobworkStatusBody,
} = require('../src/validation/schemas');

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

test('jobworkStatusBody requires status only', () => {
  const { error, value } = jobworkStatusBody.validate({ status: 'SENT' });
  assert.strictEqual(error, undefined);
  assert.strictEqual(value.status, 'SENT');
});
