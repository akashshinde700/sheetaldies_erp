/**
 * Standalone internal stock — apni company ka andar ka maal (consumables,
 * spares, tools, gases). Job-work Item master / customer ke tools se koi
 * lena-dena nahi. Har item ka apna catalog + IN / OUT / ADJUST movements
 * jinse running balance banta hai.
 */

const ExcelJS = require('exceljs');
const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');

const MOVE_TYPES = ['IN', 'OUT', 'ADJUST'];
const Q3 = (n) => Math.round((toNum(n, 0) + Number.EPSILON) * 1000) / 1000;

const itemSelect = {
  id: true, sku: true, name: true, category: true, unit: true,
  quantityOnHand: true, reorderLevel: true, location: true, unitCost: true,
  trackBatches: true, notes: true, isActive: true, updatedAt: true,
};

// ── Item catalog ──────────────────────────────────────────────
exports.listItems = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const view = String(req.query.view || 'all'); // all | low | inactive
    const page = Math.max(toInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(toInt(req.query.limit, 50), 1), 500);

    const where = {};
    if (view === 'inactive') where.isActive = false;
    else where.isActive = true;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
        { location: { contains: search } },
      ];
    }

    let rows = await prisma.stockItem.findMany({
      where,
      select: itemSelect,
      orderBy: [{ name: 'asc' }],
    });

    if (view === 'low') {
      rows = rows.filter((r) => toNum(r.quantityOnHand, 0) <= toNum(r.reorderLevel, 0));
    }

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);
    res.json({ success: true, data: paged, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Stock items load nahi hue.' });
  }
};

exports.stats = async (_req, res) => {
  try {
    const items = await prisma.stockItem.findMany({
      where: { isActive: true },
      select: { quantityOnHand: true, reorderLevel: true, unitCost: true },
    });
    const lowStock = items.filter((i) => toNum(i.quantityOnHand, 0) <= toNum(i.reorderLevel, 0)).length;
    const stockValue = items.reduce((s, i) => s + toNum(i.quantityOnHand, 0) * toNum(i.unitCost, 0), 0);

    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringSoon = await prisma.stockMovement.count({
      where: { type: 'IN', expiryDate: { not: null, lte: soon, gte: new Date() } },
    });

    res.json({
      success: true,
      data: {
        totalItems: items.length,
        lowStock,
        stockValue: Math.round(stockValue * 100) / 100,
        expiringSoon,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Stats load nahi hue.' });
  }
};

exports.categories = async (_req, res) => {
  try {
    const rows = await prisma.stockItem.findMany({
      where: { isActive: true, category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    res.json({ success: true, data: rows.map((r) => r.category).filter(Boolean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Categories load nahi hui.' });
  }
};

exports.getItem = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const item = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        movements: {
          orderBy: [{ movedAt: 'desc' }, { id: 'desc' }],
          take: 100,
          include: { createdBy: { select: { name: true } } },
        },
      },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Stock item nahi mila.' });

    // Per-batch on-hand (jab item batch-tracked ho)
    let batches = [];
    if (item.trackBatches) {
      const map = new Map();
      for (const m of item.movements) {
        const key = m.batchNo || '(no batch)';
        const cur = map.get(key) || { batchNo: m.batchNo || null, expiryDate: m.expiryDate, onHand: 0 };
        cur.onHand += (m.type === 'OUT' ? -1 : 1) * toNum(m.quantity, 0);
        if (m.expiryDate && (!cur.expiryDate || m.expiryDate < cur.expiryDate)) cur.expiryDate = m.expiryDate;
        map.set(key, cur);
      }
      batches = [...map.values()].filter((b) => Math.abs(b.onHand) > 0.0001);
    }

    res.json({ success: true, data: { ...item, batches } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Stock item load nahi hua.' });
  }
};

const cleanItemBody = (b) => ({
  sku: b.sku ? String(b.sku).trim().slice(0, 50) : null,
  name: String(b.name || '').trim().slice(0, 200),
  category: b.category ? String(b.category).trim().slice(0, 100) : null,
  unit: (String(b.unit || 'NOS').trim() || 'NOS').slice(0, 20),
  reorderLevel: Q3(b.reorderLevel),
  location: b.location ? String(b.location).trim().slice(0, 100) : null,
  unitCost: b.unitCost === '' || b.unitCost == null ? null : Math.round(toNum(b.unitCost, 0) * 100) / 100,
  trackBatches: b.trackBatches === true || b.trackBatches === 'true',
  notes: b.notes ? String(b.notes).trim().slice(0, 500) : null,
});

exports.createItem = async (req, res) => {
  try {
    const data = cleanItemBody(req.body);
    if (!data.name) return res.status(400).json({ success: false, message: 'Name zaroori hai.' });

    const opening = Q3(req.body.openingQty);
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.stockItem.create({
        data: {
          ...data,
          quantityOnHand: opening > 0 ? opening : 0,
          createdById: req.user?.id || null,
        },
      });
      if (opening > 0) {
        await tx.stockMovement.create({
          data: {
            stockItemId: created.id,
            type: 'IN',
            quantity: opening,
            balanceAfter: opening,
            batchNo: req.body.openingBatchNo ? String(req.body.openingBatchNo).trim().slice(0, 60) : null,
            expiryDate: req.body.openingExpiry ? new Date(req.body.openingExpiry) : null,
            unitCost: data.unitCost,
            reason: 'Opening stock',
            movedAt: new Date(),
            createdById: req.user?.id || null,
          },
        });
      }
      return created;
    });
    res.status(201).json({ success: true, data: item, message: `"${item.name}" add ho gaya.` });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Is SKU ka item pehle se hai.' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Stock item save nahi hua.' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const data = cleanItemBody(req.body);
    if (!data.name) return res.status(400).json({ success: false, message: 'Name zaroori hai.' });
    // quantityOnHand yahan se nahi badalti — sirf movement se badalti hai.
    const item = await prisma.stockItem.update({
      where: { id },
      data: {
        ...data,
        ...(typeof req.body.isActive === 'boolean' ? { isActive: req.body.isActive } : {}),
      },
    });
    res.json({ success: true, data: item, message: 'Stock item update ho gaya.' });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Is SKU ka item pehle se hai.' });
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Stock item nahi mila.' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Stock item update nahi hua.' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const moves = await prisma.stockMovement.count({ where: { stockItemId: id } });
    if (moves > 0) {
      // History wale item ko delete nahi karte — deactivate karte hain.
      const item = await prisma.stockItem.update({ where: { id }, data: { isActive: false } });
      return res.json({ success: true, data: item, message: 'Item ke movements the — isliye deactivate kar diya.' });
    }
    await prisma.stockItem.delete({ where: { id } });
    res.json({ success: true, message: 'Stock item delete ho gaya.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Stock item nahi mila.' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Delete nahi hua.' });
  }
};

// ── Movement: IN / OUT / ADJUST ───────────────────────────────
exports.move = async (req, res) => {
  try {
    const stockItemId = toInt(req.body.stockItemId);
    const type = String(req.body.type || '').toUpperCase();
    if (!MOVE_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Type IN, OUT ya ADJUST hona chahiye.' });
    }

    const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) return res.status(404).json({ success: false, message: 'Stock item nahi mila.' });

    const onHand = toNum(item.quantityOnHand, 0);
    let qty = Q3(req.body.quantity);
    let balanceAfter;

    if (type === 'ADJUST') {
      // ADJUST me quantity = nayi on-hand value (set), qty movement uska farak
      const target = Q3(req.body.quantity);
      if (target < 0) return res.status(400).json({ success: false, message: 'On-hand 0 se kam nahi ho sakta.' });
      qty = Math.abs(Q3(target - onHand));
      balanceAfter = target;
    } else {
      if (!(qty > 0)) return res.status(400).json({ success: false, message: 'Quantity 0 se zyada honi chahiye.' });
      if (type === 'OUT') {
        if (qty > onHand + 0.0001) {
          return res.status(400).json({ success: false, message: `Sirf ${onHand} ${item.unit} stock hai — itna OUT nahi ho sakta.` });
        }
        balanceAfter = Q3(onHand - qty);
      } else {
        balanceAfter = Q3(onHand + qty);
      }
    }

    if (item.trackBatches && type === 'IN' && !String(req.body.batchNo || '').trim()) {
      return res.status(400).json({ success: false, message: 'Ye item batch-tracked hai — Batch No zaroori hai.' });
    }

    const movedAt = req.body.movedAt ? new Date(req.body.movedAt) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const mv = await tx.stockMovement.create({
        data: {
          stockItemId,
          type,
          quantity: qty,
          balanceAfter,
          batchNo: req.body.batchNo ? String(req.body.batchNo).trim().slice(0, 60) : null,
          expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
          unitCost: req.body.unitCost === '' || req.body.unitCost == null ? null : Math.round(toNum(req.body.unitCost, 0) * 100) / 100,
          reason: req.body.reason ? String(req.body.reason).trim().slice(0, 120) : (type === 'ADJUST' ? 'Stock adjustment' : null),
          refNo: req.body.refNo ? String(req.body.refNo).trim().slice(0, 80) : null,
          note: req.body.note ? String(req.body.note).trim().slice(0, 500) : null,
          movedAt: Number.isNaN(movedAt.getTime()) ? new Date() : movedAt,
          createdById: req.user?.id || null,
        },
      });
      const updated = await tx.stockItem.update({
        where: { id: stockItemId },
        data: {
          quantityOnHand: balanceAfter,
          ...(type === 'IN' && req.body.unitCost ? { unitCost: Math.round(toNum(req.body.unitCost, 0) * 100) / 100 } : {}),
        },
        select: itemSelect,
      });
      return { mv, updated };
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `${type} ${qty} ${item.unit} — ab ${balanceAfter} ${item.unit} stock hai.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Movement save nahi hua.' });
  }
};

// ── Movement history ──────────────────────────────────────────
const movementWhere = (q) => {
  const where = {};
  if (q.stockItemId) where.stockItemId = toInt(q.stockItemId);
  const type = String(q.type || '').toUpperCase();
  if (MOVE_TYPES.includes(type)) where.type = type;
  const search = String(q.search || '').trim();
  if (search) {
    where.OR = [
      { stockItem: { name: { contains: search } } },
      { stockItem: { sku: { contains: search } } },
      { batchNo: { contains: search } },
      { refNo: { contains: search } },
    ];
  }
  if (q.from || q.to) {
    where.movedAt = {};
    if (q.from) { const d = new Date(q.from); if (!Number.isNaN(d.getTime())) where.movedAt.gte = d; }
    if (q.to) { const d = new Date(q.to); if (!Number.isNaN(d.getTime())) { d.setDate(d.getDate() + 1); where.movedAt.lt = d; } }
  }
  return where;
};

exports.listMovements = async (req, res) => {
  try {
    const page = Math.max(toInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 200);
    const where = movementWhere(req.query);

    const [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          stockItem: { select: { id: true, name: true, sku: true, unit: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: [{ movedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json({ success: true, data: rows, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Movement history load nahi hui.' });
  }
};

// ── Stock register (Excel) ────────────────────────────────────
exports.exportRegister = async (req, res) => {
  try {
    const where = movementWhere(req.query);
    const rows = await prisma.stockMovement.findMany({
      where,
      include: { stockItem: { select: { name: true, sku: true, unit: true, category: true } } },
      orderBy: [{ movedAt: 'asc' }, { id: 'asc' }],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SVT ERP';
    const ws = wb.addWorksheet('Stock Register');
    ws.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Item', key: 'item', width: 32 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Category', key: 'cat', width: 16 },
      { header: 'Type', key: 'type', width: 9 },
      { header: 'Qty', key: 'qty', width: 11 },
      { header: 'Unit', key: 'unit', width: 8 },
      { header: 'Balance', key: 'bal', width: 12 },
      { header: 'Batch', key: 'batch', width: 14 },
      { header: 'Expiry', key: 'exp', width: 12 },
      { header: 'Unit Cost', key: 'cost', width: 11 },
      { header: 'Reason', key: 'reason', width: 22 },
      { header: 'Ref No', key: 'ref', width: 16 },
      { header: 'Note', key: 'note', width: 30 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const m of rows) {
      const signed = (m.type === 'OUT' ? -1 : 1) * toNum(m.quantity, 0);
      ws.addRow({
        date: m.movedAt,
        item: m.stockItem?.name || '',
        sku: m.stockItem?.sku || '',
        cat: m.stockItem?.category || '',
        type: m.type,
        qty: signed,
        unit: m.stockItem?.unit || '',
        bal: toNum(m.balanceAfter, 0),
        batch: m.batchNo || '',
        exp: m.expiryDate || '',
        cost: m.unitCost != null ? toNum(m.unitCost, 0) : '',
        reason: m.reason || '',
        ref: m.refNo || '',
        note: m.note || '',
      });
    }
    ws.getColumn('date').numFmt = 'dd/mm/yyyy';
    ws.getColumn('exp').numFmt = 'dd/mm/yyyy';
    ws.getColumn('qty').numFmt = '#,##0.000';
    ws.getColumn('bal').numFmt = '#,##0.000';
    ws.getColumn('cost').numFmt = '#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="StockRegister_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Register nahi bana.' });
  }
};
