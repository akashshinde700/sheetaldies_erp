/**
 * Sequence Manager - Atomic Document Number Generation
 * Fixes race condition in invoice/job-card numbering using an atomic
 * increment on a dedicated counter table, so numbers are never reissued
 * even if the highest-numbered record gets deleted.
 *
 * ✅ CRITICAL FIX C1: Prevents duplicate invoice numbers
 */

const prisma = require('./prisma');

/**
 * Atomically increment and return the next integer value for a given key.
 * Starts at 1 the first time a key is used.
 *
 * Despite its name, the stored `nextValue` holds the number LAST issued — the
 * row is incremented first and the new value handed out. So a fresh key must
 * start at 0, otherwise the first document of every series is numbered 2 and
 * number 1 is never used.
 *
 * @param {string} key - Arbitrary sequence key (e.g. 'SVH/INV/26-27/', 'JOBCARD:2607')
 * @param {Object} db - Prisma client (transaction or main)
 * @returns {Promise<number>}
 */
const getNextSequenceValue = async (key, db = prisma) => {
  await db.numberSequence.upsert({
    where: { key },
    update: {},
    create: { key, nextValue: 0 },
  });

  const sequence = await db.numberSequence.update({
    where: { key },
    data: { nextValue: { increment: 1 } },
  });

  return sequence.nextValue;
};

/**
 * Generate unique invoice number atomically
 * Uses an atomic counter to prevent race conditions
 *
 * @param {string} prefix - Invoice prefix (e.g., 'SVH/INV/26-27/')
 * @param {Object} db - Prisma client (transaction or main)
 * @param {number} padWidth - Zero-padded digit width for the running number
 * @returns {Promise<string>} - Unique invoice number
 */
const getNextInvoiceNumber = async (prefix, db = prisma, padWidth = 5) => {
  try {
    const nextValue = await getNextSequenceValue(prefix, db);
    const invoiceNo = `${prefix}${String(nextValue).padStart(padWidth, '0')}`;

    // Verify uniqueness (in case older data already used this number)
    const exists = await db.taxInvoice.findUnique({ where: { invoiceNo } });
    if (exists) {
      // Recursively try next number (should rarely happen)
      return getNextInvoiceNumber(prefix, db, padWidth);
    }

    return invoiceNo;
  } catch (err) {
    console.error('Error generating invoice number:', err);
    throw new Error('Failed to generate invoice number');
  }
};

/**
 * Generate invoice number with fiscal year handling
 * Handles year transitions correctly
 *
 * @param {Object} db - Prisma client
 * @returns {Promise<string>} - Invoice number with prefix SVH/INV/YY-YY/00001
 */
const generateInvoiceNoAtomic = async (db = prisma) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = January, 3 = April

  // Fiscal year starts in April (month 3)
  const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  const fyEnd = fyStart + 1;

  const yy = String(fyStart).slice(-2);
  const yn = String(fyEnd).slice(-2);
  const prefix = `SVH/INV/${yy}-${yn}/`;

  return await getNextInvoiceNumber(prefix, db);
};

/**
 * Generate invoice number for a given series code, fiscal-year aware, with
 * its own independent running sequence per series (key = `${code}/${yy}-${yn}/`).
 * New series need no code change — just a new `invoice_series` row.
 *
 * @param {string} seriesCode - InvoiceSeries.code (e.g. 'SVT', 'SVT/AB')
 * @param {Object} db - Prisma client (transaction or main)
 * @param {number} padWidth - Zero-padded digit width for the running number
 * @returns {Promise<string>}
 */
const generateSeriesInvoiceNoAtomic = async (seriesCode, db = prisma, padWidth = 4) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
  const fyEnd = fyStart + 1;

  const yy = String(fyStart).slice(-2);
  const yn = String(fyEnd).slice(-2);
  const prefix = `${seriesCode}/${yy}-${yn}/`;

  return await getNextInvoiceNumber(prefix, db, padWidth);
};

/**
 * Generate a job card number atomically for the current YYMM, in the
 * existing "YYMMNNNN" format (e.g. 26071001), without ever reissuing a
 * number that was already used — even if that job card was later deleted.
 *
 * @param {Object} db - Prisma client (transaction or main)
 * @returns {Promise<string>}
 */
const generateJobCardNoAtomic = async (db = prisma) => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;

  const nextValue = await getNextSequenceValue(`JOBCARD:${prefix}`, db);
  const jobCardNo = `${prefix}${1000 + nextValue}`;

  const exists = await db.jobCard.findUnique({ where: { jobCardNo } });
  if (exists) {
    // Recursively try next number (should rarely happen)
    return generateJobCardNoAtomic(db);
  }

  return jobCardNo;
};

/**
 * Give a number back when the row that took it is deleted — but ONLY if it was
 * the last one issued. A mistaken create-then-delete should not burn a number
 * and leave a hole in the register. Deleting from the middle still leaves its
 * gap, because the cards printed after it already carry their numbers and
 * cannot be renumbered.
 *
 * @param {string} key    sequence key, e.g. 'JOBCARD:2608'
 * @param {number} issued the number that was issued to the deleted row
 */
const releaseSequenceValue = async (key, issued, db = prisma) => {
  try {
    const row = await db.numberSequence.findUnique({ where: { key } });
    if (!row || row.nextValue !== issued) return false;   // beech ka delete — gap rehne do
    await db.numberSequence.update({ where: { key }, data: { nextValue: issued - 1 } });
    return true;
  } catch {
    return false;   // numbering ki safai ke liye delete fail nahi hona chahiye
  }
};

/**
 * Reset sequence (for testing/admin purposes)
 * @param {string} key - Sequence key to reset
 * @param {number} value - Last-issued number to rewind to; the default 0 makes
 *                         the next document number 1.
 */
const resetSequence = async (key, value = 0) => {
  return await prisma.numberSequence.upsert({
    where: { key },
    update: { nextValue: value },
    create: { key, nextValue: value },
  });
};

module.exports = {
  getNextSequenceValue,
  getNextInvoiceNumber,
  generateInvoiceNoAtomic,
  generateSeriesInvoiceNoAtomic,
  generateJobCardNoAtomic,
  releaseSequenceValue,
  resetSequence,
};
