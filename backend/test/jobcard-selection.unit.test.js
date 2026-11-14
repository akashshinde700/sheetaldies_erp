'use strict';
// Controller-level regression tests with a transactional in-memory fake.
// These do NOT replace an authenticated API test against MySQL.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const prismaPath = require.resolve('../src/utils/prisma');
const seqPath = require.resolve('../src/utils/sequenceManager');
let state;
let forceClaimConflict = false;
const fakePrisma = {
  async $transaction(fn) {
    // Commit only if the callback succeeds: simulate transaction rollback.
    const draft = structuredClone(state);
    const tx = {
      challanItem: {
        async findMany({ where }) {
          return draft.items.filter(x => where.id.in.includes(x.id)).map(x => ({ ...x, challan: draft.challans[x.challanId] }));
        },
        async updateMany({ where, data }) {
          let rows = draft.items.filter(x => where.id.in.includes(x.id) && x.jobCardId === null && x.itemStatus === 'PENDING');
          if (forceClaimConflict) rows = rows.slice(0, -1);
          rows.forEach(x => Object.assign(x, data));
          return { count: rows.length };
        },
      },
      jobCard: { async create({ data }) { const card = { id: 101, ...data }; draft.cards.push(card); return card; } },
    };
    const result = await fn(tx);
    state = draft;
    return result;
  },
};
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };
require.cache[seqPath] = { id: seqPath, filename: seqPath, loaded: true, exports: { generateJobCardNoAtomic: async () => 'JC-TEST' } };
const controller = require('../src/controllers/jobwork.controller');

beforeEach(() => {
  forceClaimConflict = false;
  state = {
    challans: { 1: { id: 1, fromPartyId: 7 }, 2: { id: 2, fromPartyId: 8 } },
    items: [
      { id: 11, challanId: 1, itemStatus: 'PENDING', jobCardId: null, quantity: 2 },
      { id: 12, challanId: 1, itemStatus: 'PENDING', jobCardId: null, quantity: 3 },
      { id: 21, challanId: 2, itemStatus: 'PENDING', jobCardId: null, quantity: 1 },
    ],
    cards: [],
  };
});
async function call(itemIds) {
  const req = { body: { itemIds }, user: { id: 1 } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await controller.createJobCardFromItems(req, res);
  return res;
}

test('creates one card for pending items from the same challan', async () => {
  const res = await call([11, '12']);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.jobCard.quantity, 5);
  assert.equal(res.body.data.jobCard.customerId, 7);
  assert.deepEqual(state.items.map(i => i.jobCardId), [101, 101, null]);
});

test('rejects malformed, duplicate, or empty item IDs without changes', async () => {
  for (const ids of [[], [11, 11], ['11x'], [11.5], [0], [null], [{}]]) {
    assert.equal((await call(ids)).statusCode, 400);
    assert.equal(state.cards.length, 0);
    assert.ok(state.items.every(i => i.jobCardId === null));
  }
});

test('refuses missing items rather than silently creating a partial job card', async () => {
  assert.equal((await call([11, 999])).statusCode, 404);
  assert.equal(state.cards.length, 0);
});

test('refuses items belonging to different challans and customers', async () => {
  assert.equal((await call([11, 21])).statusCode, 400);
  assert.equal(state.cards.length, 0);
});

test('refuses a second assignment rather than overwriting the first card', async () => {
  state.items[0].jobCardId = 44;
  state.items[0].itemStatus = 'ASSIGNED';
  assert.equal((await call([11, 12])).statusCode, 409);
  assert.equal(state.items[0].jobCardId, 44);
  assert.equal(state.cards.length, 0);
});

test('rolls back the new job card when conditional claim loses a race', async () => {
  forceClaimConflict = true;
  assert.equal((await call([11, 12])).statusCode, 409);
  assert.equal(state.cards.length, 0);
  assert.ok(state.items.every(i => i.jobCardId === null));
});
