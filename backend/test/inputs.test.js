const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { parseYMD, isHHMM, clip, finiteOrNull, isInsideDir } = require('../src/utils/inputs');

test('parseYMD reads a date literally (UTC midnight, no timezone drift)', () => {
  assert.strictEqual(parseYMD('2026-09-07').toISOString(), '2026-09-07T00:00:00.000Z');
  assert.strictEqual(parseYMD('2026-09-07T23:30:00+05:30').toISOString(), '2026-09-07T00:00:00.000Z');
});

test('parseYMD rejects impossible or malformed dates', () => {
  for (const bad of ['2026-02-30', '2026-13-01', 'abc', '', null, undefined, '07/09/2026', new Date('nope')]) {
    assert.strictEqual(parseYMD(bad), null, String(bad));
  }
  assert.ok(parseYMD('2028-02-29'), 'leap day is valid');
  assert.strictEqual(parseYMD('2027-02-29'), null);
});

test('isHHMM accepts only 24h HH:MM', () => {
  for (const ok of ['00:00', '07:30', '23:59']) assert.ok(isHHMM(ok), ok);
  for (const bad of ['24:00', '7:30', '12:60', '12:5', 'ab:cd', '', null, 1230]) assert.ok(!isHHMM(bad), String(bad));
});

test('clip trims, cuts to length and turns empty into null', () => {
  assert.strictEqual(clip('  hello  ', 10), 'hello');
  assert.strictEqual(clip('abcdefghij', 4), 'abcd');
  assert.strictEqual(clip('   ', 5), null);
  assert.strictEqual(clip(null, 5), null);
});

test('finiteOrNull never returns NaN/Infinity', () => {
  assert.strictEqual(finiteOrNull('12.5'), 12.5);
  assert.strictEqual(finiteOrNull(''), null);
  assert.strictEqual(finiteOrNull('abc'), null);
  assert.strictEqual(finiteOrNull(Infinity), null);
});

test('isInsideDir blocks traversal and sibling directories with a shared prefix', () => {
  const root = path.resolve('/srv/app/uploads');
  assert.ok(isInsideDir(root, path.join(root, 'a', 'b.png')));
  assert.ok(!isInsideDir(root, path.resolve('/srv/app/uploads_evil/x.png')));
  assert.ok(!isInsideDir(root, path.resolve(root, '..', 'secret.txt')));
  assert.ok(!isInsideDir(root, path.resolve('/etc/passwd')));
});
