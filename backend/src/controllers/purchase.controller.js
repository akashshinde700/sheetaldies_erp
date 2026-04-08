const prisma = require('../utils/prisma');

// ── List Purchase Orders ──────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status = '', search = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { poNumber: { contains: search } },
      { vendor: { name: { contains: search } } },
    ];

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { vendor: true, items: { include: { item: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({ success: true, data: orders, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase orders.' });
  }
};

// ── Get Single PO ─────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, items: { include: { item: true } }, grns: true },
    });

    if (!order) return res.status(404).json({ success: false, message: 'PO not found.' });

    res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create PO ─────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { vendorId, items, expectedDelivery, poDate, remarks } = req.body;

    if (!vendorId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vendor and items are required.' });
    }

    // Generate PO number
    const lastPO = await prisma.purchaseOrder.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { poNumber: true },
    });

    const lastNum = lastPO?.poNumber ? parseInt(lastPO.poNumber.split('/').pop()) : 0;
    const poNumber = `PO/${new Date().getFullYear()}/${String(lastNum + 1).padStart(4, '0')}`;

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        poDate: poDate ? new Date(poDate) : new Date(),
        vendorId: parseInt(vendorId),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        remarks: remarks || null,
        status: 'DRAFT',
        totalAmount,
        createdById: req.user.id,
        items: {
          create: items.map(item => ({
            itemId: parseInt(item.itemId),
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
          })),
        },
      },
      include: { vendor: true, items: { include: { item: true } } },
    });

    res.status(201).json({ success: true, data: po, message: 'Purchase order created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create PO.' });
  }
};

// ── Update PO ─────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { vendorId, items, expectedDelivery, remarks, status } = req.body;

    const updateData = {
      ...(vendorId !== undefined && { vendorId: parseInt(vendorId) }),
      ...(expectedDelivery !== undefined && { expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null }),
      ...(remarks !== undefined && { remarks }),
      ...(status !== undefined && { status }),
    };

    if (items && Array.isArray(items) && items.length > 0) {
      const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      updateData.totalAmount = totalAmount;
      updateData.items = {
        create: items.map(item => ({
          itemId: parseInt(item.itemId),
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
        })),
      };
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { vendor: true, items: { include: { item: true } } },
    });

    res.json({ success: true, data: po, message: 'Purchase order updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update PO.' });
  }
};

// ── Delete PO ─────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
    await prisma.purchaseOrder.delete({ where: { id } });

    res.json({ success: true, message: 'Purchase order deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete PO.' });
  }
};

// ── Create GRN (Goods Receipt) ────────────────────────────────
exports.createGRN = async (req, res) => {
  try {
    const purchaseOrderId = parseInt(req.params.id) || parseInt(req.body.purchaseOrderId);
    const { items, remarks, grnDate } = req.body;

    if (!purchaseOrderId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'PO and items are required.' });
    }

    // Generate GRN number
    const lastGRN = await prisma.grn.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { grnNumber: true },
    });

    const lastNum = lastGRN?.grnNumber ? parseInt(lastGRN.grnNumber.split('/').pop()) : 0;
    const grnNumber = `GRN/${new Date().getFullYear()}/${String(lastNum + 1).padStart(4, '0')}`;

    // Create GRN
    const grn = await prisma.grn.create({
      data: {
        grnNumber,
        purchaseOrderId: parseInt(purchaseOrderId),
        grnDate: grnDate ? new Date(grnDate) : new Date(),
        remarks: remarks || null,
        status: 'RECEIVED',
        createdById: req.user.id,
        items: {
          create: items.map(item => ({
            itemId: parseInt(item.itemId),
            quantityReceived: parseInt(item.quantityReceived),
            quantityAccepted: parseInt(item.quantityAccepted),
            quantityRejected: parseInt(item.quantityRejected || 0),
            remarks: item.remarks || null,
          })),
        },
      },
      include: { purchaseOrder: true, items: { include: { item: true } } },
    });

    // Update inventory for accepted items
    for (const item of items) {
      await prisma.inventory.upsert({
        where: { itemId: parseInt(item.itemId) },
        create: {
          itemId: parseInt(item.itemId),
          quantityOnHand: parseInt(item.quantityAccepted),
          reorderLevel: 10,
          lastRestockDate: new Date(),
        },
        update: {
          quantityOnHand: { increment: parseInt(item.quantityAccepted) },
          lastRestockDate: new Date(),
        },
      });
    }

    res.status(201).json({ success: true, data: grn, message: 'GRN created and inventory updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create GRN.' });
  }
};

// ── Get Current Inventory ─────────────────────────────────────
exports.getInventory = async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        item: {
          select: {
            id: true,
            partNo: true,
            description: true,
            unit: true,
          },
        },
      },
      orderBy: { item: { partNo: 'asc' } },
    });

    res.json({ success: true, data: inventory || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory.' });
  }
};

// ── Low Stock Alert ───────────────────────────────────────────
exports.getLowStock = async (req, res) => {
  try {
    // Fetch all inventory and filter in-memory since Prisma doesn't support field-to-field comparison directly
    const allInventory = await prisma.inventory.findMany({
      include: { item: true },
    });

    const lowStock = allInventory.filter(inv => inv.quantityOnHand <= inv.reorderLevel);

    res.json({ success: true, data: lowStock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch low stock items.' });
  }
};
