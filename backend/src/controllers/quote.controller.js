const prisma = require('../utils/prisma');
const { generateQuotePDF } = require('../utils/export');

/**
 * 📋 Create a new supplier quote
 * POST /api/quotes
 */
exports.createQuote = async (req, res) => {
  try {
    const { vendorId, quoteDate, validUntil, description, items, totalAmount, notes, paymentTerms, deliveryDays } = req.body;
    const userId = req.user.id;

    // Validate vendor exists
    const vendor = await prisma.party.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({
        code: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      });
    }

    // Generate quote number
    const lastQuote = await prisma.supplierQuote.findFirst({
      orderBy: { id: 'desc' }
    });
    const nextId = (lastQuote?.id || 0) + 1;
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

    // Create quote with items
    const quote = await prisma.supplierQuote.create({
      data: {
        quoteNumber,
        vendorId,
        quoteDate: new Date(quoteDate),
        validUntil: validUntil ? new Date(validUntil) : null,
        description,
        totalAmount: parseFloat(totalAmount) || 0,
        notes,
        paymentTerms,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
        createdById: userId,
        items: {
          create: items.map(item => ({
            description: item.description,
            specification: item.specification,
            quantity: parseFloat(item.quantity),
            unit: item.unit || 'NOS',
            unitPrice: parseFloat(item.unitPrice),
            amount: parseFloat(item.amount),
            remarks: item.remarks
          }))
        }
      },
      include: {
        vendor: true,
        items: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json({
      success: true,
      code: 'QUOTE_CREATED',
      message: 'Supplier quote created successfully',
      data: quote
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({
      code: 'QUOTE_CREATION_FAILED',
      message: error.message
    });
  }
};

/**
 * 📋 Update a supplier quote
 * PUT /api/quotes/:id
 */
exports.updateQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId, quoteDate, validUntil, description, items, totalAmount, notes, paymentTerms, deliveryDays } = req.body;
    const userId = req.user.id;

    // Check if quote exists and is in draft status
    const existingQuote = await prisma.supplierQuote.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });

    if (!existingQuote) {
      return res.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found'
      });
    }

    if (existingQuote.status !== 'DRAFT') {
      return res.status(400).json({
        code: 'QUOTE_NOT_EDITABLE',
        message: 'Only draft quotes can be edited'
      });
    }

    // Validate vendor exists
    const vendor = await prisma.party.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({
        code: 'VENDOR_NOT_FOUND',
        message: 'Vendor not found'
      });
    }

    // Update quote with items
    const quote = await prisma.supplierQuote.update({
      where: { id: parseInt(id) },
      data: {
        vendorId,
        quoteDate: new Date(quoteDate),
        validUntil: validUntil ? new Date(validUntil) : null,
        description,
        totalAmount: parseFloat(totalAmount) || 0,
        notes,
        paymentTerms,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
        items: {
          deleteMany: {}, // Delete existing items
          create: items.map(item => ({
            description: item.description,
            specification: item.specification,
            quantity: parseFloat(item.quantity),
            unit: item.unit || 'NOS',
            unitPrice: parseFloat(item.unitPrice),
            amount: parseFloat(item.amount),
            remarks: item.remarks
          }))
        }
      },
      include: {
        vendor: true,
        items: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({
      success: true,
      code: 'QUOTE_UPDATED',
      message: 'Supplier quote updated successfully',
      data: quote
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({
      code: 'QUOTE_UPDATE_FAILED',
      message: error.message
    });
  }
};

/**
 * 📋 Get all supplier quotes
 * GET /api/quotes
 */
exports.getQuotes = async (req, res) => {
  try {
    const { vendorId, status, page = 1, limit = 20, search = '' } = req.query;

    const where = {};
    if (vendorId) where.vendorId = parseInt(vendorId);
    if (status) where.status = status;
    const searchText = String(search || '').trim();
    if (searchText) {
      where.OR = [
        { quoteNumber: { contains: searchText } },
        { description: { contains: searchText } },
        { vendor: { is: { name: { contains: searchText } } } },
      ];
    }

    const quotes = await prisma.supplierQuote.findMany({
      where,
      include: {
        vendor: true,
        items: true,
        createdBy: { select: { id: true, name: true, email: true } },
        attachments: {
          select: { id: true, fileName: true, fileSize: true, mimeType: true }
        }
      },
      orderBy: { quoteDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.supplierQuote.count({ where });

    res.status(200).json({
      success: true,
      data: quotes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({
      code: 'QUOTE_FETCH_FAILED',
      message: error.message
    });
  }
};

/**
 * 📋 Get single quote
 * GET /api/quotes/:id
 */
exports.getQuoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await prisma.supplierQuote.findUnique({
      where: { id: parseInt(id) },
      include: {
        vendor: true,
        items: true,
        createdBy: { select: { id: true, name: true, email: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        attachments: {
          select: { id: true, fileName: true, fileSize: true, mimeType: true, filePath: true, description: true }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({
      code: 'QUOTE_FETCH_FAILED',
      message: error.message
    });
  }
};

/**
 * 📋 Update quote status
 * PATCH /api/quotes/:id/status
 */
exports.updateQuoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED_TO_PO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        code: 'INVALID_STATUS',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const quote = await prisma.supplierQuote.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        vendor: true,
        items: true
      }
    });

    res.status(200).json({
      success: true,
      code: 'QUOTE_STATUS_UPDATED',
      message: 'Quote status updated successfully',
      data: quote
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found'
      });
    }
    console.error('Error updating quote status:', error);
    res.status(500).json({
      code: 'QUOTE_UPDATE_FAILED',
      message: error.message
    });
  }
};

/**
 * 📋 Delete quote
 * DELETE /api/quotes/:id
 */
exports.deleteQuote = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete quote items first (cascade)
    await prisma.quoteItem.deleteMany({
      where: { quoteId: parseInt(id) }
    });

    // Delete attachments
    await prisma.attachment.deleteMany({
      where: { quoteId: parseInt(id) }
    });

    // Delete quote
    const quote = await prisma.supplierQuote.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      code: 'QUOTE_DELETED',
      message: 'Quote deleted successfully',
      data: quote
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found'
      });
    }
    console.error('Error deleting quote:', error);
    res.status(500).json({
      code: 'QUOTE_DELETE_FAILED',
      message: error.message
    });
  }
};

/**
 * 📋 Export quote to PDF
 * GET /api/quotes/:id/pdf
 */
exports.exportQuotePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await prisma.supplierQuote.findUnique({
      where: { id: parseInt(id) },
      include: {
        vendor: true,
        items: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!quote) {
      return res.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found'
      });
    }

    const filepath = await generateQuotePDF(quote);
    const filename = `quote_${quote.quoteNumber}.pdf`;

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Error exporting quote PDF:', error);
    res.status(500).json({
      code: 'QUOTE_EXPORT_FAILED',
      message: error.message
    });
  }
};

/**
 * 📋 Convert quote to purchase order
 * POST /api/quotes/:id/convert-to-po
 */
exports.convertToPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get quote with items
    const quote = await prisma.supplierQuote.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });

    if (!quote) {
      return res.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found'
      });
    }

    // Generate PO number
    const lastPO = await prisma.purchaseOrder.findFirst({
      orderBy: { id: 'desc' }
    });
    const nextId = (lastPO?.id || 0) + 1;
    const poNumber = `PO-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

    // Create PO in transaction
    const po = await prisma.$transaction(async (tx) => {
      // Create PO
      const newPO = await tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: quote.vendorId,
          poDate: new Date(),
          expectedDelivery: quote.validUntil,
          totalAmount: quote.totalAmount,
          createdById: userId,
          items: {
            create: quote.items.map(item => ({
              description: item.description,
              quantity: Math.ceil(item.quantity),
              unitPrice: item.unitPrice,
              amount: item.amount
            }))
          }
        },
        include: {
          vendor: true,
          items: true
        }
      });

      // Update quote status
      await tx.supplierQuote.update({
        where: { id: parseInt(id) },
        data: {
          status: 'CONVERTED_TO_PO',
          purchaseOrderId: newPO.id
        }
      });

      return newPO;
    });

    res.status(201).json({
      success: true,
      code: 'PO_CREATED_FROM_QUOTE',
      message: 'Purchase Order created from quote successfully',
      data: po
    });
  } catch (error) {
    console.error('Error converting quote to PO:', error);
    res.status(500).json({
      code: 'CONVERSION_FAILED',
      message: error.message
    });
  }
};
