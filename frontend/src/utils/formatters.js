/**
 * Centralized formatting utilities for the ERP system
 */

/**
 * Formats a number as Indian Currency (INR)
 * @param {number|string} value - The value to format
 * @param {boolean} includeSymbol - Whether to include the ₹ symbol
 * @returns {string} Formatted string
 */
export const formatCurrency = (value, includeSymbol = false) => {
  const n = typeof value === 'number' ? value : Number(String(value || '0').replace(/,/g, ''));
  const formatted = (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSymbol ? `₹${formatted}` : formatted;
};

/**
 * Formats a date to Indian localized string
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN');
};

/**
 * Formats a date with time
 */
export const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats weight values with 3 decimal places (default)
 */
export const formatWeight = (value, decimals = 3) => {
  const n = typeof value === 'number' ? value : Number(String(value || '0').replace(/,/g, ''));
  return (Number.isFinite(n) ? n : 0).toFixed(decimals);
};
