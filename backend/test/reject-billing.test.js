/**
 * Rejected pieces are scrap — they can never be billed.
 *
 * This is money logic, so it is checked against the real server and the real
 * database rather than a mock. It creates its own scratch rows (two parties, a
 * challan, a certificate, one REJECT entry, one invoice) and deletes them all
 * again — it never reads from or writes to existing records.
 *
 * Needs the backend running on :5000 and a reachable DB:
 *   npm start           (in another terminal)
 *   npm run test:billing
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const API = process.env.TEST_API || 'http://localhost:5000/api';
const prisma = new PrismaClient();

const token = () => jwt.sign(
  { id: 1, email: 'admin@local', role: 'ADMIN', name: 'Administrator' },
  process.env.JWT_SECRET,
  { expiresIn: '30m' },
);

async function call(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      'X-Request-ID': 'reject-billing-test',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* not every error body is JSON */ }
  return { status: res.status, data };
}

const lineOf = (res) => (res.data?.data?.lineStatus || res.data?.lineStatus || [])[0];

test('rejected pieces drop out of the billable quantity', async (t) => {
  const made = {};
  t.after(async () => {
    if (made.invoice) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: made.invoice } }).catch(() => {});
      await prisma.taxInvoice.delete({ where: { id: made.invoice } }).catch(() => {});
    }
    if (made.entry) await prisma.reworkEntry.delete({ where: { id: made.entry } }).catch(() => {});
    if (made.reworkMonth) await prisma.reworkMonth.delete({ where: { id: made.reworkMonth } }).catch(() => {});
    if (made.cert) {
      await prisma.certItem.deleteMany({ where: { certId: made.cert } }).catch(() => {});
      await prisma.testCertificate.delete({ where: { id: made.cert } }).catch(() => {});
    }
    if (made.challan) {
      await prisma.challanItem.deleteMany({ where: { challanId: made.challan } }).catch(() => {});
      await prisma.jobworkChallan.delete({ where: { id: made.challan } }).catch(() => {});
    }
    if (made.parties) await prisma.party.deleteMany({ where: { id: { in: made.parties } } }).catch(() => {});
    await prisma.$disconnect();
  });

  const customer = await prisma.party.create({ data: { name: 'RJT CUSTOMER', partyType: 'CUSTOMER', address: 'x' } });
  const processor = await prisma.party.create({ data: { name: 'RJT PROCESSOR', partyType: 'BOTH', address: 'x' } });
  made.parties = [customer.id, processor.id];

  const challan = await prisma.jobworkChallan.create({
    data: {
      challanNo: 'RJT-CH-1', inwardNo: 'RJT-INW-1', challanDate: new Date(),
      fromPartyId: customer.id, toPartyId: processor.id, createdById: 1,
      items: { create: [{ description: 'RJT PART', quantity: 10, weight: 20, rate: 10, amount: 200 }] },
    },
    include: { items: true },
  });
  made.challan = challan.id;
  const chItem = challan.items[0];

  const before = await call('GET', `/invoices/challan/${challan.id}/billing-status`);
  assert.equal(before.status, 200, 'billing status should be reachable');
  assert.equal(lineOf(before).remainingQty, 10, 'with nothing rejected, all 10 pcs are billable');

  // Reject 3 of the 10, through a certificate line traced back to this challan item.
  const cert = await prisma.testCertificate.create({
    data: {
      certNo: 'RJT-CERT-1', issueDate: new Date(), customerId: customer.id, createdById: 1,
      items: { create: [{ description: 'RJT PART', quantity: 10, sourceChallanItemId: chItem.id }] },
    },
    include: { items: true },
  });
  made.cert = cert.id;

  // Year 2099 so this can never collide with — or clean up — a real month row.
  const month = await prisma.reworkMonth.create({ data: { year: 2099, month: 12, createdById: 1 } });
  made.reworkMonth = month.id;
  const entry = await prisma.reworkEntry.create({
    data: {
      monthId: month.id, srNo: 1, entryDate: new Date(), type: 'REJECT', qty: 3,
      certificateId: cert.id, certItemId: cert.items[0].id, description: 'RJT PART', createdById: 1,
    },
  });
  made.entry = entry.id;

  const after = await call('GET', `/invoices/challan/${challan.id}/billing-status`);
  assert.equal(lineOf(after).rejectedQty, 3, 'the 3 rejected pcs are reported');
  assert.equal(lineOf(after).remainingQty, 7, 'only the 7 good pcs stay billable');

  const series = await prisma.invoiceSeries.findFirst({ select: { id: true } });
  assert.ok(series, 'an invoice series must exist to bill against');
  const invoiceFor = (qty) => ({
    challanId: challan.id, fromPartyId: processor.id, toPartyId: customer.id,
    invoiceSeriesId: series.id, invoiceDate: '2026-09-20',
    items: [{ description: 'RJT PART', quantity: qty, weight: qty * 2, rate: 10, amount: qty * 10, sourceChallanItemId: chItem.id }],
  });

  const over = await call('POST', '/invoices', invoiceFor(10));
  assert.ok(over.status >= 400, `billing all 10 must be refused, got HTTP ${over.status}`);
  assert.match(over.data?.message || '', /rejected and cannot be billed/i, 'the refusal says why');

  const good = await call('POST', '/invoices', invoiceFor(7));
  assert.ok(good.status < 400, `billing the 7 good pcs must still work, got HTTP ${good.status} ${JSON.stringify(good.data)}`);
  made.invoice = good.data?.data?.id || good.data?.id;

  const done = await call('GET', `/invoices/challan/${challan.id}/billing-status`);
  assert.equal(lineOf(done).remainingQty, 0, 'nothing is left to bill afterwards');
});
