const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const http = require('http');

let server;
let baseUrl;

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
          resolve({ status: res.statusCode, body: parsedBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

before(async () => {
  process.env.NODE_ENV = 'test';
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

describe('Job Card from Selected Items Flow', () => {
  it('creates parties, inward with items, creates job card from selected items, verifies pending items', async () => {
    // 1. Create two parties
    const p1 = await request('POST', '/api/parties', { name: 'Test Customer', address: 'Addr 1' });
    assert.equal(p1.status, 201);
    const p2 = await request('POST', '/api/parties', { name: 'Test Processor', address: 'Addr 2', partyType: 'VENDOR' });
    assert.equal(p2.status, 201);

    // 2. Create inward (inward-with-jobcards) with 3 items
    const body = {
      fromPartyId: p1.body.data.id,
      toPartyId: p2.body.data.id,
      challanDate: new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      items: [
        { description: 'Item A', quantity: 1, weight: 1.1, rate: 100, processTypeId: null, processName: 'Proc A' },
        { description: 'Item B', quantity: 1, weight: 2.2, rate: 100, processTypeId: null, processName: 'Proc B' },
        { description: 'Item C', quantity: 1, weight: 3.3, rate: 100, processTypeId: null, processName: 'Proc C' },
      ],
    };
    const inv = await request('POST', '/api/jobwork/inward-with-jobcards', body);
    assert.equal(inv.status, 201);
    const challan = inv.body.data.challan;
    assert.ok(challan.id);
    assert.equal(challan.items.length, 3);

    // 3. Create job card from first two items
    const itemIds = [challan.items[0].id, challan.items[1].id];
    const createJC = await request('POST', '/api/jobwork/jobcard-from-items', { itemIds });
    assert.equal(createJC.status, 201);
    const jc = createJC.body.data.jobCard;
    assert.ok(jc.id);

    // 4. Check pending items for challan (should be 1)
    const pending = await request('GET', `/api/jobwork/${challan.id}/pending-items`);
    assert.equal(pending.status, 200);
    assert.equal(pending.body.data.length, 1);

    // 5. Verify that selected items have jobCardId set
    const item1 = challan.items[0];
    const getItem = await request('GET', `/api/jobwork/${challan.id}`);
    assert.equal(getItem.status, 200);
    const refreshed = getItem.body.data;
    const linked = refreshed.items.filter(it => it.jobCardId === jc.id);
    assert.equal(linked.length, 2);
  });
});
