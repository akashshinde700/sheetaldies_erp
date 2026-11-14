'use strict';
// Controller-level regression tests using a fake DB; not a MySQL integration test.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const prismaPath = require.resolve('../src/utils/prisma');
let state;
function makeDb(data) {
  return {
    jobworkChallan: { async findUnique({ where }) { return where.id === 1 ? { id: 1, jobCardId: null } : null; } },
    challanItem: {
      async findMany() { return [{ jobCardId: null }]; },
      async findUnique({ where }) { return where.id === 11 ? { id: 11, challanId: 1, quantity: 10 } : null; },
    },
    dispatchChallanItem: {
      async findMany({ where }) { return data.items.filter(x => x.dispatchId === where.dispatchId); },
      async aggregate({ where }) {
        const rows = data.items.filter(x => x.sourceChallanItemId === where.sourceChallanItemId &&
          (!where.dispatchId || x.dispatchId !== where.dispatchId.not) &&
          ['SENT', 'RECEIVED', 'COMPLETED'].includes(data.dispatches[x.dispatchId]?.status));
        return { _sum: { quantity: rows.reduce((sum, x) => sum + x.quantity, 0) } };
      },
      async deleteMany({ where }) { data.items = data.items.filter(x => x.dispatchId !== where.dispatchId); },
    },
    dispatchChallan: {
      async findUnique({ where }) { return data.dispatches[where.id] || null; },
      async findFirst() { return null; },
      async create({ data: input }) {
        const id = 99; data.dispatches[id] = { id, status: input.status, jobworkChallanId: input.jobworkChallanId, challanNo: input.challanNo };
        for (const item of input.items?.create || []) data.items.push({ ...item, dispatchId: id });
        return data.dispatches[id];
      },
      async update({ where, data: patch }) {
        const d = data.dispatches[where.id];
        Object.assign(d, { ...(patch.status !== undefined && { status: patch.status }) });
        if (patch.items?.create) patch.items.create.forEach(item => data.items.push({ ...item, dispatchId: where.id }));
        return d;
      },
    },
  };
}
const fake = new Proxy({}, {
  get(_target, key) {
    if (key === '$transaction') return async (fn, opts) => {
      assert.equal(opts.isolationLevel, 'Serializable');
      const draft = structuredClone(state); const result = await fn(makeDb(draft)); state = draft; return result;
    };
    return makeDb(state)[key];
  },
});
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fake };
const ctrl = require('../src/controllers/dispatch.controller');
const line = (quantity) => ({ sourceChallanItemId: 11, itemId: 1, quantity });
const res = () => ({ statusCode: 200, status(code) { this.statusCode=code; return this; }, json(body) { this.body=body; return this; } });
async function create(items, status) { const r=res(); await ctrl.create({ body: { jobworkChallanId: 1, fromPartyId: 1, toPartyId: 2, items, status }, user: { id: 1 } },r); return r; }
async function update(id, items) { const r=res(); await ctrl.update({ params: { id: String(id) }, body: { items } },r); return r; }
async function status(id, value) { const r=res(); await ctrl.updateStatus({ params: { id: String(id) }, body: { status: value } },r); return r; }
beforeEach(() => { state = { dispatches: {}, items: [] }; });

test('create rejects duplicate source rows whose combined quantity exceeds the inward line', async () => {
  const r=await create([line(6),line(6)]);
  assert.equal(r.statusCode,400); assert.match(r.body.message,/Over-dispatch/); assert.equal(Object.keys(state.dispatches).length,0);
});

test('create accepts duplicate source rows within the remaining quantity', async () => {
  state.dispatches[3]={id:3,status:'SENT',jobworkChallanId:1}; state.items.push({ ...line(2),dispatchId:3 });
  const r=await create([line(4),line(4)]);
  assert.equal(r.statusCode,201); assert.equal(state.items.length,3);
});

test('editing a dispatch also validates combined source quantities', async () => {
  state.dispatches[1]={id:1,status:'DRAFT',jobworkChallanId:1}; state.items.push({ ...line(2),dispatchId:1 });
  const r=await update(1,[line(6),line(6)]);
  assert.equal(r.statusCode,400); assert.equal(state.items[0].quantity,2);
});

test('a draft cannot be sent if another dispatch consumed its available quantity', async () => {
  state.dispatches[1]={id:1,status:'DRAFT',jobworkChallanId:1}; state.items.push({ ...line(7),dispatchId:1 });
  state.dispatches[2]={id:2,status:'SENT',jobworkChallanId:1}; state.items.push({ ...line(5),dispatchId:2 });
  const r=await status(1,'SENT');
  assert.equal(r.statusCode,400); assert.match(r.body.message,/Over-dispatch/); assert.equal(state.dispatches[1].status,'DRAFT');
});

test('a draft can be sent when the total is within the inward quantity', async () => {
  state.dispatches[1]={id:1,status:'DRAFT',jobworkChallanId:1}; state.items.push({ ...line(7),dispatchId:1 });
  state.dispatches[2]={id:2,status:'SENT',jobworkChallanId:1}; state.items.push({ ...line(3),dispatchId:2 });
  assert.equal((await status(1,'SENT')).statusCode,200); assert.equal(state.dispatches[1].status,'SENT');
});

test('new dispatches cannot start in a later or terminal state', async () => {
  for (const s of ['RECEIVED', 'COMPLETED', 'CANCELLED']) {
    assert.equal((await create([{itemId:5,sourceChallanItemId:11,quantity:1}],s)).statusCode,400);
  }
  assert.equal((await create([{itemId:5,sourceChallanItemId:11,quantity:1}],'SENT')).statusCode,201);
});
test('invalid status transitions are refused and do not mutate the dispatch', async () => {
  state.dispatches[1]={id:1,status:'DRAFT',jobworkChallanId:1};
  assert.equal((await status(1,'COMPLETED')).statusCode,400); assert.equal(state.dispatches[1].status,'DRAFT');
  const r=res();
  await ctrl.update({ params:{ id:'1' }, body:{ status:'COMPLETED' } },r);
  assert.equal(r.statusCode,400); assert.equal(state.dispatches[1].status,'DRAFT');
});
