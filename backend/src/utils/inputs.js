// Small, dependency-free input guards shared by the register-style endpoints
// (rework, NC, energy, tempering, utilisation, idle time, plant losses).

const path = require('path');

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Strict date-only parse -> Date at UTC midnight, or null when it is not a real
 * calendar date. "YYYY-MM-DD" (or an ISO string starting with it) is read
 * literally, so the result never depends on the server's timezone.
 */
function parseYMD(input) {
  if (input == null || input === '') return null;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const m = YMD.exec(String(input));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** "HH:MM" (24h) */
const isHHMM = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Trim + cut to a column's max length; empty -> null. */
function clip(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/** Finite number or null (never NaN/Infinity). */
function finiteOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** true only when `target` is `root` itself or truly inside it (not a sibling like `root_x`). */
function isInsideDir(root, target) {
  const r = path.resolve(root);
  const t = path.resolve(target);
  return t === r || t.startsWith(r + path.sep);
}

module.exports = { parseYMD, isHHMM, clip, finiteOrNull, isInsideDir };
