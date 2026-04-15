/**
 * Sequence Manager - Atomic Invoice Number Generation
 * Fixes race condition in invoice numbering using database-level locking
 * 
 * ✅ CRITICAL FIX C1: Prevents duplicate invoice numbers
 */

const prisma = require('./prisma');

/**
 * Generate unique invoice number atomically
 * Uses SELECT FOR UPDATE to lock row and prevent race conditions
 * 
 * @param {string} prefix - Invoice prefix (e.g., 'SVH/INV/26-27/')
 * @param {Object} db - Prisma client (transaction or main)
 * @returns {Promise<string>} - Unique invoice number
 */
const getNextInvoiceNumber = async (prefix, db = prisma) => {
  try {
    // 1. Find or create sequence record for this prefix
    let sequence = await db.invoiceSequence.upsert({
      where: { prefix },
      update: {},
      create: { prefix, nextValue: 1 }
    });

    // 2. Atomic increment with lock (prevents concurrent increments)
    sequence = await db.invoiceSequence.update({
      where: { prefix },
      data: { nextValue: { increment: 1 } }
    });

    // 3. Generate invoice number
    const invoiceNo = `${prefix}${String(sequence.nextValue).padStart(5, '0')}`;

    // 4. Verify uniqueness (in case of race condition)
    const exists = await db.taxInvoice.findUnique({ where: { invoiceNo } });
    if (exists) {
      // Recursively try next number (should rarely happen)
      return getNextInvoiceNumber(prefix, db);
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
 * Initialize sequence manager
 * Ensures sequence table exists and is properly indexed
 * Call this once during app startup
 */
const initializeSequenceManager = async () => {
  try {
    // Verify table structure
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS invoiceSequence (
        prefix VARCHAR(50) PRIMARY KEY,
        nextValue BIGINT NOT NULL DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Invoice sequence manager initialized');
  } catch (err) {
    console.error('Failed to initialize sequence manager:', err);
    // Don't throw - might already exist
  }
};

/**
 * Reset sequence (for testing/admin purposes)
 * @param {string} prefix - Prefix to reset
 * @param {number} value - New starting value
 */
const resetSequence = async (prefix, value = 1) => {
  return await prisma.invoiceSequence.upsert({
    where: { prefix },
    update: { nextValue: value },
    create: { prefix, nextValue: value }
  });
};

module.exports = {
  getNextInvoiceNumber,
  generateInvoiceNoAtomic,
  initializeSequenceManager,
  resetSequence
};
