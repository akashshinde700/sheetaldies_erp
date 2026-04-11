const prisma = require('../utils/prisma');
const { transaction } = require('../utils/transaction');
const { toInt, toNum } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];
  return rawItems.map((item) => {
    const itemId = toInt(item.itemId);
    const quantity = toInt(item.quantity);
    const unitPrice = toNum(item.unitPrice);
    const amount = quantity * unitPrice;
    return { itemId, quantity, unitPrice, amount };
  });
}

function hasInvalidPoItem(items) {
  return items.some(
    (item) =>
      !Number.isInteger(item.itemId) ||
      item.itemId <= 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.unitPrice) ||
      item.unitPrice < 0,
  );
}

async function createInventoryMovement(tx, data) {
  return tx.inventoryMovement.create({
    data: {
      itemId: data.itemId,
      source: data.source,
      quantityChange: data.quantityChange,
      balanceAfter: data.balanceAfter,
      reorderLevelAfter: data.reorderLevelAfter,
      referenceType: data.referenceType || null,
      referenceId: data.referenceId || null,
      remarks: data.remarks || null,
      createdById: data.createdById,
    },
  });
}

const isUniqueViolation = (err) =>
  err && err.code === 'P2002';

// ── List Purchase Orders ──────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { status = '', search = '', page = 1, limit = 20, fromDate, toDate } = req.query;
    const skip = (toInt(page, 1) - 1) * toInt(limit, 20);
    const exportAll = String(req.query.exportAll) === 'true';

    // ✅ FIXED: Cap export limit to prevent DOS attacks
    // exportAll still works but limited to MAX_EXPORT_LIMIT records
    const MAX_EXPORT_LIMIT = 5000;
    const finalLimit = exportAll ? Math.min(MAX_EXPORT_LIMIT, 5000) : toInt(limit, 20);
    const finalSkip = exportAll ? 0 : skip;

    // DEBUG: Log export request details
    console.log('[PURCHASE EXPORT DEBUG]', {
      exportAll,
      page,
      limit,
      skip,
      status,
      search,
      fromDate,
      toDate,
      timestamp: new Date().toISOString(),
    });

    const where = {};
    if (status) where.status = status;
    const searchText = String(search || '').trim();
    if (searchText) where.OR = [
      { poNumber: { contains: searchText, mode: 'insensitive' } },
      { vendor: { is: { name: { contains: searchText, mode: 'insensitive' } } } },
    ];

    // Date filtering
    if (fromDate || toDate) {
      where.poDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!Number.isNaN(from.getTime())) {
          where.poDate.gte = from;
        }
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!Number.isNaN(to.getTime())) {
          // Add one day to include the end date
          to.setDate(to.getDate() + 1);
          where.poDate.lt = to;
        }
      }
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { vendor: true, items: { include: { item: true } } },
        orderBy: { poDate: 'desc' },
        skip: finalSkip,
        take: finalLimit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    // DEBUG: Log results
    console.log('[PURCHASE RESULTS]', {
      ordersReturned: orders.length,
      totalInDB: total,
      exportAll,
      responseLimit: finalLimit,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, data: orders, total, page: exportAll ? 1 : toInt(page, 1), limit: finalLimit });
  } catch (err) {
    next(err);
  }
};

// ── Get Single PO ─────────────────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const id = toInt(req.params.id);

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, items: { include: { item: true } }, grns: true },
    });

    if (!order) return res.status(404).json({ success: false, message: 'PO not found.' });

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// ── Create PO ─────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { vendorId, items, expectedDelivery, poDate, remarks } = req.body;
    const vendorIdInt = toInt(vendorId);
    const normalizedItems = normalizeItems(items);

    if (!Number.isInteger(vendorIdInt) || vendorIdInt <= 0 || normalizedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Vendor and items are required.' });
    }
    if (hasInvalidPoItem(normalizedItems)) {
      return res.status(400).json({ success: false, message: 'Each line must have valid item, qty (>0) and unit price (>=0).' });
    }

    const [vendor, foundItems] = await Promise.all([
      prisma.party.findUnique({ where: { id: vendorIdInt }, select: { id: true, partyType: true } }),
      prisma.item.findMany({
        where: { id: { in: normalizedItems.map((i) => i.itemId) } },
        select: { id: true },
      }),
    ]);
    if (!vendor || !['VENDOR', 'BOTH'].includes(vendor.partyType)) {
      return res.status(400).json({ success: false, message: 'Selected party is not a valid vendor.' });
    }
    if (foundItems.length !== new Set(normalizedItems.map((i) => i.itemId)).size) {
      return res.status(400).json({ success: false, message: 'One or more selected items do not exist.' });
    }

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
    let po;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        po = await prisma.$transaction(async (tx) => {
          const lastPO = await tx.purchaseOrder.findFirst({
            orderBy: { id: 'desc' },
            select: { poNumber: true },
          });
          const lastNum = lastPO?.poNumber ? toInt(lastPO.poNumber.split('/').pop(), 0) : 0;
          const poNumber = `PO/${new Date().getFullYear()}/${String(lastNum + 1).padStart(4, '0')}`;
          return tx.purchaseOrder.create({
            data: {
              poNumber,
              poDate: poDate ? new Date(poDate) : new Date(),
              vendorId: vendorIdInt,
              expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
              remarks: remarks || null,
              status: 'DRAFT',
              totalAmount,
              createdById: req.user.id,
              items: {
                create: normalizedItems.map((item) => ({
                  itemId: item.itemId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: item.amount,
                })),
              },
            },
            include: { vendor: true, items: { include: { item: true } } },
          });
        }, { isolationLevel: 'Serializable' });
        break;
      } catch (err) {
        if (isUniqueViolation(err) && attempt < 2) continue;
        throw err;
      }
    }

    res.status(201).json({ success: true, data: po, message: 'Purchase order created.' });
  } catch (err) {
    next(err);
  }
};

// ── Update PO ─────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { vendorId, items, expectedDelivery, remarks, status, poDate } = req.body;
    const vendorIdInt = vendorId !== undefined ? toInt(vendorId) : undefined;
    const normalizedItems = items === undefined ? undefined : normalizeItems(items);

    if (vendorId !== undefined && (!Number.isInteger(vendorIdInt) || vendorIdInt <= 0)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor.' });
    }
    if (normalizedItems !== undefined && normalizedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required.' });
    }
    if (normalizedItems && hasInvalidPoItem(normalizedItems)) {
      return res.status(400).json({ success: false, message: 'Each line must have valid item, qty (>0) and unit price (>=0).' });
    }

    if (vendorIdInt !== undefined) {
      const vendor = await prisma.party.findUnique({ where: { id: vendorIdInt }, select: { id: true, partyType: true } });
      if (!vendor || !['VENDOR', 'BOTH'].includes(vendor.partyType)) {
        return res.status(400).json({ success: false, message: 'Selected party is not a valid vendor.' });
      }
    }
    if (normalizedItems) {
      const foundItems = await prisma.item.findMany({
        where: { id: { in: normalizedItems.map((i) => i.itemId) } },
        select: { id: true },
      });
      if (foundItems.length !== new Set(normalizedItems.map((i) => i.itemId)).size) {
        return res.status(400).json({ success: false, message: 'One or more selected items do not exist.' });
      }
    }

    const updateData = {
      ...(vendorId !== undefined && { vendorId: vendorIdInt }),
      ...(poDate !== undefined && { poDate: poDate ? new Date(poDate) : new Date() }),
      ...(expectedDelivery !== undefined && { expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null }),
      ...(remarks !== undefined && { remarks }),
      ...(status !== undefined && { status }),
    };

    const po = await prisma.$transaction(async (tx) => {
      if (normalizedItems && normalizedItems.length > 0) {
        const totalAmount = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        updateData.totalAmount = totalAmount;
        updateData.items = {
          create: normalizedItems.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        };
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: { vendor: true, items: { include: { item: true } } },
      });
    }, { isolationLevel: 'Serializable' });

    res.json({ success: true, data: po, message: 'Purchase order updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update PO.' });
  }
};

// ── Delete PO ─────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const id = toInt(req.params.id);

    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    }, { isolationLevel: 'Serializable' });

    res.json({ success: true, message: 'Purchase order deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete PO.' });
  }
};

// ── Create GRN (Goods Receipt) ────────────────────────────────
exports.createGRN = async (req, res) => {
  try {
    const purchaseOrderId = toInt(req.params.id) || toInt(req.body.purchaseOrderId);
    const { items, remarks, grnDate } = req.body;

    if (!purchaseOrderId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'PO and items are required.' });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    const normalized = items.map((item) => ({
      itemId: toInt(item.itemId),
      quantityReceived: toInt(item.quantityReceived),
      quantityAccepted: toInt(item.quantityAccepted),
      quantityRejected: toInt(item.quantityRejected || 0),
      remarks: item.remarks || null,
    }));
    const invalidLine = normalized.find(
      (line) =>
        !Number.isInteger(line.itemId) ||
        line.itemId <= 0 ||
        !Number.isInteger(line.quantityReceived) ||
        line.quantityReceived < 0 ||
        !Number.isInteger(line.quantityAccepted) ||
        line.quantityAccepted < 0 ||
        !Number.isInteger(line.quantityRejected) ||
        line.quantityRejected < 0 ||
        line.quantityAccepted + line.quantityRejected > line.quantityReceived,
    );
    if (invalidLine) {
      return res.status(400).json({ success: false, message: 'Invalid GRN quantities in one or more lines.' });
    }

    const poItemIds = new Set((po.items || []).map((x) => x.itemId));
    if (normalized.some((line) => !poItemIds.has(line.itemId))) {
      return res.status(400).json({ success: false, message: 'GRN contains item not present in this PO.' });
    }

    let grn;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        grn = await prisma.$transaction(async (tx) => {
          const lastGRN = await tx.grn.findFirst({
            orderBy: { id: 'desc' },
            select: { grnNumber: true },
          });
          const lastNum = lastGRN?.grnNumber ? toInt(lastGRN.grnNumber.split('/').pop(), 0) : 0;
          const grnNumber = `GRN/${new Date().getFullYear()}/${String(lastNum + 1).padStart(4, '0')}`;

          const created = await tx.grn.create({
            data: {
              grnNumber,
              purchaseOrderId: purchaseOrderId,
              grnDate: grnDate ? new Date(grnDate) : new Date(),
              remarks: remarks || null,
              status: 'RECEIVED',
              createdById: req.user.id,
              items: {
                create: normalized,
              },
            },
            include: { purchaseOrder: true, items: { include: { item: true } } },
          });

          for (const item of normalized) {
            const inventoryRow = await tx.inventory.upsert({
              where: { itemId: item.itemId },
              create: {
                itemId: item.itemId,
                quantityOnHand: item.quantityAccepted,
                reorderLevel: 10,
                lastRestockDate: new Date(),
              },
              update: {
                quantityOnHand: { increment: item.quantityAccepted },
                lastRestockDate: new Date(),
              },
            });

            if (item.quantityAccepted > 0) {
              await createInventoryMovement(tx, {
                itemId: item.itemId,
                source: 'GRN',
                quantityChange: item.quantityAccepted,
                balanceAfter: inventoryRow.quantityOnHand,
                reorderLevelAfter: inventoryRow.reorderLevel,
                referenceType: 'GRN',
                referenceId: created.id,
                remarks: item.remarks || null,
                createdById: req.user.id,
              });
            }
          }

          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: 'RECEIVED' },
          });

          return created;
        }, { isolationLevel: 'Serializable' });
        break;
      } catch (err) {
        if (isUniqueViolation(err) && attempt < 2) continue;
        throw err;
      }
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
    const search = String(req.query.search || '').trim();
    const where = search
      ? {
          item: {
            OR: [
              { partNo: { contains: search } },
              { description: { contains: search } },
              { hsnCode: { contains: search } },
            ],
          },
        }
      : {};

    const inventory = await prisma.inventory.findMany({
      where,
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
    const search = String(req.query.search || '').trim().toLowerCase();
    // Prisma cannot directly compare quantityOnHand <= reorderLevel across columns, filter in-memory
    const allInventory = await prisma.inventory.findMany({
      include: { item: true },
    });

    const lowStock = allInventory.filter((inv) => {
      const low = inv.quantityOnHand <= inv.reorderLevel;
      if (!low) return false;
      if (!search) return true;
      const blob = `${inv.item?.partNo || ''} ${inv.item?.description || ''} ${inv.item?.hsnCode || ''}`.toLowerCase();
      return blob.includes(search);
    });

    res.json({ success: true, data: lowStock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch low stock items.' });
  }
};

// ── Inventory Movement History ────────────────────────────────
exports.getInventoryMovements = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const source = String(req.query.source || '').trim();
    const itemId = req.query.itemId ? toInt(req.query.itemId) : null;
    const page = Math.max(toInt(req.query.page || '1', 1), 1);
    const limit = Math.min(Math.max(toInt(req.query.limit || '20', 20), 1), 100);
    const skip = (page - 1) * limit;
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
    const toDateRaw = req.query.toDate ? new Date(req.query.toDate) : null;
    const toDate = toDateRaw ? new Date(toDateRaw.getFullYear(), toDateRaw.getMonth(), toDateRaw.getDate() + 1) : null;
    const createdAt = {};
    if (fromDate && !Number.isNaN(fromDate.getTime())) createdAt.gte = fromDate;
    if (toDate && !Number.isNaN(toDate.getTime())) createdAt.lt = toDate;

    const where = {
      ...(search
        ? {
            item: {
              OR: [
                { partNo: { contains: search } },
                { description: { contains: search } },
                { hsnCode: { contains: search } },
              ],
            },
          }
        : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(source && ['GRN', 'MANUAL_ADJUSTMENT'].includes(source) ? { source } : {}),
      ...(Number.isInteger(itemId) && itemId > 0 ? { itemId } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return res.json({ success: true, data: rows, total, page, limit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory movement history.' });
  }
};

// ── Add / Update Inventory Manually ───────────────────────────
exports.upsertInventory = async (req, res) => {
  try {
    const itemId = toInt(req.body.itemId);
    const quantityOnHand = toInt(req.body.quantityOnHand);
    const reorderLevelRaw = req.body.reorderLevel;
    const reorderLevel = reorderLevelRaw === undefined || reorderLevelRaw === null || reorderLevelRaw === ''
      ? 10
      : toInt(reorderLevelRaw);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid itemId is required.' });
    }
    if (!Number.isInteger(quantityOnHand) || quantityOnHand < 0) {
      return res.status(400).json({ success: false, message: 'Quantity on hand must be 0 or more.' });
    }
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
      return res.status(400).json({ success: false, message: 'Reorder level must be 0 or more.' });
    }

    const itemExists = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!itemExists) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({ where: { itemId } });
      const next = await tx.inventory.upsert({
        where: { itemId },
        create: {
          itemId,
          quantityOnHand,
          reorderLevel,
          lastRestockDate: new Date(),
        },
        update: {
          quantityOnHand,
          reorderLevel,
          lastRestockDate: new Date(),
        },
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
      });

      const quantityDelta = quantityOnHand - (existing?.quantityOnHand || 0);
      const reorderChanged = (existing?.reorderLevel ?? null) !== reorderLevel;
      if (quantityDelta !== 0 || reorderChanged || !existing) {
        await createInventoryMovement(tx, {
          itemId,
          source: 'MANUAL_ADJUSTMENT',
          quantityChange: quantityDelta,
          balanceAfter: quantityOnHand,
          reorderLevelAfter: reorderLevel,
          referenceType: 'MANUAL',
          remarks: req.body.remarks || 'Manual inventory update',
          createdById: req.user.id,
        });
      }

      return next;
    });

    return res.status(201).json({
      success: true,
      data: row,
      message: 'Inventory saved successfully.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to save inventory.' });
  }
};
