/**
 * Invoice Creation Handler - FIXED
 * Applies all CRITICAL fixes:
 * - C1: Atomic invoice numbering (no race condition)
 * - C2: Overbilling prevention with optimistic locking
 * 
 * Usage:
 * const { createInvoiceSafely } = require('../utils/invoiceCreationHandler');
 * const invoice = await createInvoiceSafely(invoiceData, db);
 */

const prisma = require('./prisma');
const { generateInvoiceNoAtomic } = require('./sequenceManager');
const { validateInvoiceAgainstChallan } = require('./quantityValidator');
const { log } = require('./logger');

/**
 * Create invoice with all safety checks
 * ✅ C1: Atomic invoice number generation (no race condition)
 * ✅ C2: Validates against overbilling with Serializable isolation
 * 
 * @param {Object} invoiceData - Invoice data with items
 * @param {number} challanId - Source challan ID for validation
 * @param {Object} db - Prisma client (optional, uses main prisma if not provided)
 * @returns {Promise<Object>} - Created invoice
 * @throws {Error} - If validation fails or creation fails
 */
const createInvoiceSafely = async (invoiceData, challanId, db = prisma) => {
  let invoice = null;

  try {
    // Use Serializable isolation level to prevent concurrent conflicts
    const result = await db.$transaction(
      async (tx) => {
        // Step 1: Generate atomic invoice number (fixes C1)
        const invoiceNo = await generateInvoiceNoAtomic(tx);
        console.log(`[INVOICE] Generated invoice number: ${invoiceNo}`);

        // Step 2: Validate against overbilling (fixes C2)
        const validation = await validateInvoiceAgainstChallan(invoiceData, challanId, tx);
        
        if (!validation.valid) {
          throw new Error(`Overbilling validation failed: ${JSON.stringify(validation)}`);
        }

        console.log(`[INVOICE] Validation passed:`, {
          challanTotal: validation.challanTotal,
          alreadyInvoiced: validation.alreadyInvoiced,
          newInvoiceQty: validation.newInvoiceQuantity,
          wouldBeInvoiced: validation.wouldBeInvoiced
        });

        // Step 3: Create invoice with atomic invoice number
        invoice = await tx.taxInvoice.create({
          data: {
            invoiceNo,
            ...invoiceData,
            sourceDispatchChallanId: challanId,
            items: {
              create: invoiceData.items
            }
          },
          include: { items: true }
        });

        // Step 4: Log financial transaction
        log.financial('Invoice created', {
          invoiceNo: invoice.invoiceNo,
          invoiceId: invoice.id,
          challanId: challanId,
          amount: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          itemCount: invoiceData.items.length
        });

        return invoice;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 10000 // 10 second timeout to prevent deadlocks
      }
    );

    return result;
  } catch (err) {
    // Log error with context
    log.error('Invoice creation failed', {
      invoiceNo: invoice?.invoiceNo,
      challanId: challanId,
      error: err.message,
      code: err.code
    });

    // Re-throw with context
    if (err.code === 'P2034') {
      throw new Error('Invoice creation conflict due to concurrent modification. Please retry.');
    }

    throw err;
  }
};

/**
 * Create partial invoice (partial invoicing of challan)
 * ✅ Ensures remaining quantity is tracked
 * 
 * @param {Object} invoiceData - Partial invoice data
 * @param {number} challanId - Challan being partially invoiced
 * @param {Object} db - Prisma client
 * @returns {Promise<Object>} - Created partial invoice
 */
const createPartialInvoice = async (invoiceData, challanId, db = prisma) => {
  try {
    // Validate that we're not overbilling
    const validation = await validateInvoiceAgainstChallan(
      invoiceData,
      challanId,
      db
    );

    if (!validation.valid) {
      throw new Error(`Partial invoice validation failed: ${JSON.stringify(validation)}`);
    }

    // Create invoice with safety checks
    return await createInvoiceSafely(invoiceData, challanId, db);
  } catch (err) {
    log.error('Partial invoice creation failed', {
      challanId,
      error: err.message
    });
    throw err;
  }
};

/**
 * Validate invoice can be created
 * Used for pre-flight checks before creation attempt
 */
const validateInvoiceCreation = async (invoiceData, challanId, db = prisma) => {
  try {
    const validation = await validateInvoiceAgainstChallan(
      invoiceData,
      challanId,
      db
    );

    return {
      valid: validation.valid !== false,
      details: validation,
      message: validation.valid ? 'Invoice can be created' : 'Invoice validation failed'
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message
    };
  }
};

module.exports = {
  createInvoiceSafely,
  createPartialInvoice,
  validateInvoiceCreation
};
