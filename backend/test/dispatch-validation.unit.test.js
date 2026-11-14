'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDispatchSchema } = require('../src/validation/commercial.validator');
const payload = quantity => ({ fromPartyId: 1, toPartyId: 2, items: [{ itemId: 3, quantity }] });

test('dispatch schema accepts fractional positive quantities supported by the database', () => {
  assert.equal(createDispatchSchema.validate(payload(1.25)).error, undefined);
  assert.equal(createDispatchSchema.validate(payload(0.001)).error, undefined);
});

test('dispatch schema rejects non-positive quantities and missing master item', () => {
  for (const quantity of [0, -1, 1.0001, 1000000000]) assert.ok(createDispatchSchema.validate(payload(quantity)).error);
  assert.ok(createDispatchSchema.validate({ fromPartyId: 1, toPartyId: 2, items: [{ description: 'Demo', quantity: 1 }] }).error);
});
