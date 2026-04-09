export const toInt = (value, fallback = NaN) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? n : fallback;
};

export const toNum = (value, fallback = NaN) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};
