export const toInt = (value: any, fallback: number = NaN): number => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? n : fallback;
};

export const toNum = (value: any, fallback: number = NaN): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};
