const toInt = (value, fallback = NaN) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? n : fallback;
};

const toNum = (value, fallback = NaN) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
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
  toPositiveIntOrNull,
  toDateOrNull,
  asArray,
};

