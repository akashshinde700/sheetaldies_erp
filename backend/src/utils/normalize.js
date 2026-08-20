const toInt = (value, fallback = NaN) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? n : fallback;
};

const toNum = (value, fallback = NaN) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

// Every monetary column is Decimal(12,2), so a derived amount has to be rounded
// to paise BEFORE it is fed into another sum. Adding raw products and rounding
// only at the end drifts from what Tally (and the printed invoice) show: 9% of
// 10030.50 is 902.745, and 10030.50 + 902.745 + 902.745 stores as 11835.99
// while 10030.50 + 902.75 + 902.75 is 11836.00.
// Number.EPSILON nudges values like 1.005 that sit just below the half-way
// point in binary floating point.
const toMoney = (value) => {
  const n = toNum(value, 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + (n >= 0 ? Number.EPSILON : -Number.EPSILON)) * 100) / 100;
};

const toPositiveIntOrNull = (value) => {
  const n = toInt(value, NaN);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const toDateOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

module.exports = {
  toInt,
  toNum,
  toMoney,
  toPositiveIntOrNull,
  toDateOrNull,
  asArray,
};

