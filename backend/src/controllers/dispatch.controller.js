const prisma = require('../utils/prisma');

const toNum = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const assertDispatchAllowed = async ({ jobworkChallanId }) => {
  if (!jobworkChallanId) return true;

  const jw = await prisma.jobworkChallan.findUnique({
    where: { id: parseInt(jobworkChallanId) },
    include: { jobCard: true },
  });
  if (!jw) return 'Linked Jobwork challan not found.';

  // Rule: Certificate required before dispatch
  if (jw.jobCardId) {
    const cert = await prisma.testCertificate.findFirst({ where: { jobCardId: jw.jobCardId } });
    if (!cert) return 'Test Certificate is required before dispatch.';
  }

  return true;
};

const getDispatchedQtyForChallanItem = async ({ sourceChallanItemId, excludeDispatchId = null }) => {
  const agg = await prisma.dispatchChallanItem.aggregate({
    where: {
      sourceChallanItemId: parseInt(sourceChallanItemId),
      ...(excludeDispatchId ? { dispatchId: { not: parseInt(excludeDispatchId) } } : {}),
      dispatch: { status: { in: ['SENT', 'RECEIVED', 'COMPLETED'] } },
    },
    _sum: { quantity: true },
  });
  return toNum(agg._sum.quantity);
};

// ── List Dispatch Challans ────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const [total, challans] = await Promise.all([
      prisma.dispatchChallan.count({ where }),
      prisma.dispatchChallan.findMany({
        where,
        include: {
          fromParty: { select: { name: true } },
          toParty: { select: { name: true } },
          items: { include: { item: { select: { partNo: true, description: true } } } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
    ]);

    const enhanced = challans.map(c => ({
      ...c,
      itemCount: c.items?.length || 0,
    }));

    res.json({ success: true, data: enhanced, meta: { total } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Get Single Dispatch Challan ───────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const challan = await prisma.dispatchChallan.findUnique({
      where: { id },
      include: {
        fromParty: true,
        toParty: true,
        jobworkChallan: { select: { id: true, challanNo: true } },
        items: { include: { item: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    res.json({ success: true, data: challan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Dispatch Challan ───────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      challanDate,
      fromPartyId,
      toPartyId,
      jobworkChallanId,
      dispatchMode,
      vehicleNo,
      remarks,
      status,
      items,
    } = req.body;

    if (!fromPartyId || !toPartyId) {
      return res.status(400).json({ success: false, message: 'From and To party required.' });
    }

    // Generate challan number
    const y = new Date().getFullYear().toString().slice(-2);
    const yn = String(parseInt(y) + 1);
    const prefix = `SVH/DC/${y}-${yn}/`;

    const last = await prisma.dispatchChallan.findFirst({
      where: { challanNo: { startsWith: prefix } },
      orderBy: { challanNo: 'desc' },
    });

    let nextSerial = 1;
    if (last) {
      const parts = last.challanNo.split('/');
      const lastSerial = parseInt(parts[parts.length - 1]) || 0;
      nextSerial = lastSerial + 1;
    }

    const challanNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : (items || []);

    // Gating: certificate required when linked to jobwork challan
    const allowed = await assertDispatchAllowed({ jobworkChallanId });
    if (allowed !== true) return res.status(400).json({ success: false, message: allowed });

    // If linked to jobwork challan, enforce item mapping + over-dispatch prevention
    if (jobworkChallanId) {
      for (const it of parsedItems) {
        if (!it.sourceChallanItemId) {
          return res.status(400).json({ success: false, message: 'Source challan line is required for dispatch items when Jobwork Challan is linked.' });
        }
        const chItem = await prisma.challanItem.findUnique({
          where: { id: parseInt(it.sourceChallanItemId) },
          select: { id: true, challanId: true, quantity: true },
        });
        if (!chItem || chItem.challanId !== parseInt(jobworkChallanId)) {
          return res.status(400).json({ success: false, message: 'Invalid source challan line for this jobwork challan.' });
        }
        const alreadyDispatched = await getDispatchedQtyForChallanItem({ sourceChallanItemId: chItem.id });
        const nextTotal = alreadyDispatched + toNum(it.quantity);
        if (nextTotal - toNum(chItem.quantity) > 0.00001) {
          return res.status(400).json({ success: false, message: `Over-dispatch blocked. Challan line ${chItem.id}: dispatched ${alreadyDispatched}, trying ${toNum(it.quantity)}, total ${nextTotal} > ${toNum(chItem.quantity)}.` });
        }
      }
    }

    const challan = await prisma.dispatchChallan.create({
      data: {
        challanNo,
        challanDate: challanDate ? new Date(challanDate) : new Date(),
        fromPartyId: parseInt(fromPartyId),
        toPartyId: parseInt(toPartyId),
        jobworkChallanId: jobworkChallanId ? parseInt(jobworkChallanId) : null,
        dispatchMode: dispatchMode || null,
        vehicleNo: vehicleNo || null,
        remarks: remarks || null,
        status: status || 'DRAFT',
        createdById: req.user.id,
        items: parsedItems.length > 0 ? {
          create: parsedItems.map(it => ({
            itemId: parseInt(it.itemId),
            sourceChallanItemId: it.sourceChallanItemId ? parseInt(it.sourceChallanItemId) : null,
            description: it.description || null,
            quantity: parseInt(it.quantity),
            weightKg: it.weightKg ? parseFloat(it.weightKg) : null,
            remarks: it.remarks || null,
          })),
        } : undefined,
      },
      include: {
        fromParty: { select: { name: true } },
        toParty: { select: { name: true } },
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      data: challan,
      message: `Dispatch challan ${challan.challanNo} created successfully.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creating dispatch challan.' });
  }
};

// ── Update Dispatch Challan ───────────────────────────────────
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      challanDate,
      fromPartyId,
      toPartyId,
      jobworkChallanId,
      dispatchMode,
      vehicleNo,
      remarks,
      status,
      items,
    } = req.body;

    const existing = await prisma.dispatchChallan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    const allowed = await assertDispatchAllowed({ jobworkChallanId: jobworkChallanId ?? existing.jobworkChallanId });
    if (allowed !== true) return res.status(400).json({ success: false, message: allowed });

    // If items provided, delete old and recreate
    if (items) {
      await prisma.dispatchChallanItem.deleteMany({ where: { dispatchId: id } });
    }

    const parsedItems = items ? (typeof items === 'string' ? JSON.parse(items) : items) : null;

    if ((jobworkChallanId ?? existing.jobworkChallanId) && parsedItems) {
      const jwId = parseInt(jobworkChallanId ?? existing.jobworkChallanId);
      for (const it of parsedItems) {
        if (!it.sourceChallanItemId) {
          return res.status(400).json({ success: false, message: 'Source challan line is required for dispatch items when Jobwork Challan is linked.' });
        }
        const chItem = await prisma.challanItem.findUnique({
          where: { id: parseInt(it.sourceChallanItemId) },
          select: { id: true, challanId: true, quantity: true },
        });
        if (!chItem || chItem.challanId !== jwId) {
          return res.status(400).json({ success: false, message: 'Invalid source challan line for this jobwork challan.' });
        }
        const alreadyDispatched = await getDispatchedQtyForChallanItem({ sourceChallanItemId: chItem.id, excludeDispatchId: id });
        const nextTotal = alreadyDispatched + toNum(it.quantity);
        if (nextTotal - toNum(chItem.quantity) > 0.00001) {
          return res.status(400).json({ success: false, message: `Over-dispatch blocked. Challan line ${chItem.id}: dispatched ${alreadyDispatched}, trying ${toNum(it.quantity)}, total ${nextTotal} > ${toNum(chItem.quantity)}.` });
        }
      }
    }

    const updated = await prisma.dispatchChallan.update({
      where: { id },
      data: {
        ...(challanDate !== undefined && { challanDate: new Date(challanDate) }),
        ...(fromPartyId !== undefined && { fromPartyId: parseInt(fromPartyId) }),
        ...(toPartyId !== undefined && { toPartyId: parseInt(toPartyId) }),
        ...(jobworkChallanId !== undefined && { jobworkChallanId: jobworkChallanId ? parseInt(jobworkChallanId) : null }),
        ...(dispatchMode !== undefined && { dispatchMode }),
        ...(vehicleNo !== undefined && { vehicleNo }),
        ...(remarks !== undefined && { remarks }),
        ...(status !== undefined && { status }),
        ...(parsedItems && {
          items: {
            create: parsedItems.map(it => ({
              itemId: parseInt(it.itemId),
              sourceChallanItemId: it.sourceChallanItemId ? parseInt(it.sourceChallanItemId) : null,
              description: it.description || null,
              quantity: parseInt(it.quantity),
              weightKg: it.weightKg ? parseFloat(it.weightKg) : null,
              remarks: it.remarks || null,
            })),
          },
        }),
      },
      include: {
        fromParty: { select: { name: true } },
        toParty: { select: { name: true } },
        items: true,
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Dispatch challan updated successfully.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error updating dispatch challan.' });
  }
};

// ── Delete Dispatch Challan ───────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.dispatchChallan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    // Delete items first (cascade should handle this, but be safe)
    await prisma.dispatchChallanItem.deleteMany({ where: { dispatchId: id } });
    await prisma.dispatchChallan.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Dispatch challan deleted successfully.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error deleting dispatch challan.' });
  }
};

// ── Update Dispatch Status ────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await prisma.dispatchChallan.findUnique({ where: { id }, select: { jobworkChallanId: true } });
    const allowed = await assertDispatchAllowed({ jobworkChallanId: existing?.jobworkChallanId });
    if (allowed !== true && ['SENT', 'RECEIVED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: allowed });
    }

    const updated = await prisma.dispatchChallan.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      data: updated,
      message: `Dispatch challan status updated to ${status}.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error updating status.' });
  }
};
