/**
 * Database Transaction Utilities
 * Ensures atomic operations - all succeed or all fail
 */

const prisma = require('./prisma');

/**
 * Execute multiple operations in a single transaction
 * @param {Function} callback - Function that receives prisma client and performs operations
 * @returns {Promise} - Result of transaction
 * 
 * @example
 * const result = await transaction(async (tx) => {
 *   const invoice = await tx.taxInvoice.create({ ... });
 *   const items = await tx.invoiceItem.createMany({ ... });
 *   return { invoice, items };
 * });
 */
const transaction = async (callback) => {
  try {
    const result = await prisma.$transaction(callback);
    return result;
  } catch (err) {
    console.error('Transaction failed:', err.message);
    throw {
      code: 'TRANSACTION_FAILED',
      message: 'Operation failed. All changes have been rolled back.',
      originalError: process.env.NODE_ENV === 'development' ? err.message : undefined,
    };
  }
};

/**
 * Execute multiple async operations in sequence within a transaction
 * @param {...Function} operations - Array of async operations
 * @returns {Promise<Array>} - Results of all operations
 * 
 * @example
 * const [invoice, items] = await transactionBatch(
 *   (tx) => tx.taxInvoice.create({ ... }),
 *   (tx) => tx.invoiceItem.createMany({ ... })
 * );
 */
const transactionBatch = async (...operations) => {
  return transaction(async (tx) => {
    const results = [];
    for (const op of operations) {
      // Each operation receives the transaction client
      results.push(await op(tx));
    }
    return results;
  });
};

/**
 * Safe create with automatic transaction
 * @example
 * const { invoice, items } = await safeCreate({
 *   invoice: { data: { ... }, model: 'taxInvoice' },
 *   items: { data: [ ...], model: 'invoiceItem'  }
 * });
 */
const safeCreate = async (operations) => {
  const results = {};
  
  return transaction(async (tx) => {
    for (const [key, op] of Object.entries(operations)) {
      const { model, data, isMany = false } = op;
      
      if (isMany) {
        results[key] = await tx[model].createMany({ data });
      } else {
        results[key] = await tx[model].create({ data });
      }
    }
    return results;
  });
};

/**
 * Retry transaction on conflict (for handling concurrent updates)
 * @param {Function} callback - Transaction callback
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise} - Result of transaction
 */
const transactionWithRetry = async (callback, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transaction(callback);
    } catch (err) {
      lastError = err;
      
      // Only retry on concurrent update errors
      if (!err.message?.includes('conflict') && !err.code?.includes('CONFLICT')) {
        throw err;
      }
      
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = Math.pow(2, attempt - 1) * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

module.exports = {
  transaction,
  transactionBatch,
  safeCreate,
  transactionWithRetry,
};
