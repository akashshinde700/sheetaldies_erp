/**
 * The three whole-sheet registers can be cleared, not just zeroed.
 *
 * Runs against the real server and DB. It creates its own scratch furnace and
 * sheets and removes them again — existing records are never touched.
 *
 *   npm start            (in another terminal)
 *   npm run test:clear
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const API = process.env.TEST_API || 'http://localhost:5000/api';
const prisma = new PrismaClient();

// Year 2099 so a scratch sheet can never collide with, or clear, a real one.
const YEAR = 2099;
const MONTH = 12;
const DATE = `${YEAR}-12-15`;

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
      'X-Request-ID': 'clear-registers-test',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* not every body is JSON */ }
  return { status: res.status, data };
}

test('a register sheet can be cleared outright', async (t) => {
  const machine = await prisma.machine.create({ data: { code: 'CLR-1', name: 'CLR-FURNACE' } });
  t.after(async () => {
    await prisma.furnaceUtilizationDay.deleteMany({ where: { machineId: machine.id } }).catch(() => {});
    await prisma.dailyIdleLog.deleteMany({ where: { machineId: machine.id } }).catch(() => {});
    const m = await prisma.plantLossMonth.findUnique({ where: { year_month: { year: YEAR, month: MONTH } }, select: { id: true } }).catch(() => null);
    if (m) await prisma.plantLossMonth.delete({ where: { id: m.id } }).catch(() => {});
    await prisma.machine.delete({ where: { id: machine.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  await t.test('furnace utilisation — one day', async () => {
    const saved = await call('POST', '/manufacturing/furnace-utilization', {
      machineId: machine.id, date: DATE, signedBy: 'UI test',
      shifts: [{ shiftNo: 1, runningHours: 6 }],
    });
    assert.ok(saved.status < 400, `save failed: HTTP ${saved.status} ${JSON.stringify(saved.data)}`);
    assert.equal(await prisma.furnaceUtilizationDay.count({ where: { machineId: machine.id } }), 1);

    const cleared = await call('DELETE', `/manufacturing/furnace-utilization?machineId=${machine.id}&date=${DATE}`);
    assert.ok(cleared.status < 400, `clear failed: HTTP ${cleared.status} ${JSON.stringify(cleared.data)}`);
    assert.equal(await prisma.furnaceUtilizationDay.count({ where: { machineId: machine.id } }), 0, 'the sheet is gone, not zeroed');

    const again = await call('DELETE', `/manufacturing/furnace-utilization?machineId=${machine.id}&date=${DATE}`);
    assert.equal(again.status, 404, 'clearing nothing says so rather than pretending it worked');
  });

  await t.test('monthly idle time — a whole month', async () => {
    const saved = await call('POST', '/manufacturing/idle-logs', {
      machineId: machine.id, year: YEAR, month: MONTH,
      days: [{ day: 15, idleHours: 3, reason: 'UI test' }],
    });
    assert.ok(saved.status < 400, `save failed: HTTP ${saved.status} ${JSON.stringify(saved.data)}`);
    assert.ok(await prisma.dailyIdleLog.count({ where: { machineId: machine.id } }) > 0);

    const cleared = await call('DELETE', `/manufacturing/idle-logs?machineId=${machine.id}&year=${YEAR}&month=${MONTH}`);
    assert.ok(cleared.status < 400, `clear failed: HTTP ${cleared.status} ${JSON.stringify(cleared.data)}`);
    assert.equal(await prisma.dailyIdleLog.count({ where: { machineId: machine.id } }), 0);
  });

  await t.test('plant losses — a whole month', async () => {
    const saved = await call('POST', '/manufacturing/plant-losses', {
      year: YEAR, month: MONTH,
      entries: [{ machineId: machine.id, furnaceLabel: 'CLR-FURNACE', availableHours: 624, breakdownHours: 4 }],
    });
    assert.ok(saved.status < 400, `save failed: HTTP ${saved.status} ${JSON.stringify(saved.data)}`);

    const cleared = await call('DELETE', `/manufacturing/plant-losses?year=${YEAR}&month=${MONTH}`);
    assert.ok(cleared.status < 400, `clear failed: HTTP ${cleared.status} ${JSON.stringify(cleared.data)}`);
    assert.equal(await prisma.plantLossMonth.count({ where: { year: YEAR, month: MONTH } }), 0);
  });

  await t.test('a bad request is refused, not silently ignored', async () => {
    const noDate = await call('DELETE', `/manufacturing/furnace-utilization?machineId=${machine.id}&date=not-a-date`);
    assert.equal(noDate.status, 400);
    const badMonth = await call('DELETE', `/manufacturing/plant-losses?year=${YEAR}&month=13`);
    assert.equal(badMonth.status, 400);
  });
});
