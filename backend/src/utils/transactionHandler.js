/**
 * Transaction Wrapper - Ensures data consistency
 * ✅ FIXED: Wrap multi-step operations in transactions
 */

/**
 * Execute a database operation in a transaction
 * Automatically rolls back on any error
 */
const withTransaction = async (prisma, callback) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
    return result;
  } catch (err) {
    // Transaction automatically rolled back by Prisma
    console.error('Transaction failed and rolled back:', err.message);
    throw err;
  }
};

/**
 * Execute multiple queries in a transaction
 * Usage: withTransactionQueries(prisma, async (tx) => {
 *   const item1 = await tx.table1.create(...);
 *   const item2 = await tx.table2.create(...);
 *   return { item1, item2 };
 * })
 */
const withTransactionQueries = withTransaction;

module.exports = {
  withTransaction,
  withTransactionQueries,
};
