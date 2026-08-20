const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');

// Helper: compute summary for a challan item
function itemSummary(item, entries) {
  const assignedQty = Number(item.quantity || 0);
  const completedQty = entries.reduce((s, e) => s + Number(e.completedQty || 0), 0);
  const pendingQty = Math.max(0, assignedQty - completedQty);
  let itemStatus = 'PENDING';
  if (completedQty >= assignedQty && assignedQty > 0) itemStatus = 'COMPLETED';
  else if (completedQty > 0) itemStatus = 'PARTIAL';
  return { assignedQty, completedQty, pendingQty, itemStatus };
}

// POST /api/production-entries
// Body: { challanItemId, completedQty, completedWeightKg?, remarks? }
exports.create = async (req, res) => {
  try {
    const { challanItemId, completedQty, completedWeightKg, remarks } = req.body;

    if (!challanItemId || completedQty === undefined || completedQty === null) {
      return res.status(400).json({ success: false, message: 'challanItemId and completedQty are required.' });
    }

    const qty = toNum(completedQty, null);
    if (qty === null || qty <= 0) {
      return res.status(400).json({ success: false, message: 'completedQty must be a positive number.' });
    }

    // Atomic serializable transaction: check-and-insert prevents race condition
    let entry, summary, jobCardProductionStatus;
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Re-fetch inside transaction for guaranteed current state
        const item = await tx.challanItem.findUnique({
          where: { id: toInt(challanItemId) },
          include: { productionEntries: true },
        });
        if (!item) throw { code: 'NOT_FOUND', message: 'Challan item not found.' };

        const assignedQty = Number(item.quantity || 0);
        const alreadyCompleted = item.productionEntries.reduce((s, e) => s + Number(e.completedQty || 0), 0);
        const remaining = assignedQty - alreadyCompleted;

        if (qty > remaining + 0.0001) {
          throw {
            code: 'OVER_COMPLETION',
            message: `Entered qty (${qty}) exceeds remaining qty (${remaining.toFixed(3)}). Assigned: ${assignedQty}, already completed: ${alreadyCompleted.toFixed(3)}.`,
          };
        }

        const newEntry = await tx.productionEntry.create({
          data: {
            challanItemId: toInt(challanItemId),
            completedQty: qty,
            completedWeightKg: completedWeightKg ? toNum(completedWeightKg, null) : null,
            remarks: remarks || null,
            createdById: req.user?.id || null,
          },
        });

        const allEntries = [...item.productionEntries, newEntry];
        const s = itemSummary(item, allEntries);

        // If this item is now fully completed AND linked to a job card, check job card completion
        let jcStatus = null;
        if (s.itemStatus === 'COMPLETED' && item.jobCardId) {
          const allLinkedItems = await tx.challanItem.findMany({
            where: { jobCardId: item.jobCardId },
            include: { productionEntries: true },
          });
          const allDone = allLinkedItems.every(ci => {
            const done = ci.productionEntries.reduce((acc, e) => acc + Number(e.completedQty || 0), 0);
            return done >= Number(ci.quantity || 0);
          });
          const anyProgress = allLinkedItems.some(ci => {
            const done = ci.productionEntries.reduce((acc, e) => acc + Number(e.completedQty || 0), 0);
            return done > 0;
          });
          jcStatus = allDone ? 'ALL_ITEMS_COMPLETED' : anyProgress ? 'PARTIAL' : 'PENDING';
        }

        return { entry: newEntry, summary: s, jcStatus };
      }, { isolationLevel: 'Serializable' });

      entry = result.entry;
      summary = result.summary;
      jobCardProductionStatus = result.jcStatus;
    } catch (txErr) {
      if (txErr.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: txErr.message });
      if (txErr.code === 'OVER_COMPLETION') return res.status(400).json({ success: false, message: txErr.message });
      throw txErr;
    }

    res.status(201).json({
      success: true,
      data: {
        entry,
        summary,
        jobCardProductionStatus, // 'ALL_ITEMS_COMPLETED' → frontend can prompt user to update JC status
      },
    });
  } catch (err) {
    console.error('[production.create]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/production-entries/item/:challanItemId
exports.getByItem = async (req, res) => {
  try {
    const challanItemId = toInt(req.params.challanItemId);
    const item = await prisma.challanItem.findUnique({
      where: { id: challanItemId },
      include: {
        productionEntries: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Challan item not found.' });

    const summary = itemSummary(item, item.productionEntries);
    res.json({ success: true, data: { item, entries: item.productionEntries, summary } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/production-entries/job-card/:jobCardId
// Returns all items linked to this job card + their production summaries
exports.getByJobCard = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);

    const items = await prisma.challanItem.findMany({
      where: { jobCardId },
      include: {
        challan: { select: { id: true, challanNo: true, inwardNo: true } },
        productionEntries: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const itemsWithSummary = items.map(item => ({
      ...item,
      ...itemSummary(item, item.productionEntries),
    }));

    // Job-card level production status
    const allCompleted = itemsWithSummary.every(i => i.itemStatus === 'COMPLETED');
    const anyPartial   = itemsWithSummary.some(i => i.itemStatus === 'PARTIAL' || i.itemStatus === 'COMPLETED');
    const productionStatus = allCompleted ? 'COMPLETED' : anyPartial ? 'PARTIAL' : 'PENDING';

    res.json({ success: true, data: { items: itemsWithSummary, productionStatus } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/production-entries/:id  (MANAGER only — edit a past entry)
exports.updateEntry = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { completedQty, completedWeightKg, remarks } = req.body;

    if (completedQty === undefined) {
      return res.status(400).json({ success: false, message: 'completedQty is required.' });
    }
    const newQty = toNum(completedQty, null);
    if (newQty === null || newQty <= 0) {
      return res.status(400).json({ success: false, message: 'completedQty must be a positive number.' });
    }

    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const entry = await tx.productionEntry.findUnique({
          where: { id },
          include: { challanItem: { include: { productionEntries: true } } },
        });
        if (!entry) throw { code: 'NOT_FOUND', message: 'Production entry not found.' };

        const item = entry.challanItem;
        const assignedQty = Number(item.quantity || 0);
        // Sum excluding this entry
        const otherCompleted = item.productionEntries
          .filter(e => e.id !== id)
          .reduce((s, e) => s + Number(e.completedQty || 0), 0);
        const remaining = assignedQty - otherCompleted;

        if (newQty > remaining + 0.0001) {
          throw {
            code: 'OVER_COMPLETION',
            message: `New qty (${newQty}) exceeds remaining qty (${remaining.toFixed(3)}). Assigned: ${assignedQty}, other entries total: ${otherCompleted.toFixed(3)}.`,
          };
        }

        return tx.productionEntry.update({
          where: { id },
          data: {
            completedQty: newQty,
            completedWeightKg: completedWeightKg !== undefined ? (completedWeightKg ? toNum(completedWeightKg, null) : null) : entry.completedWeightKg,
            remarks: remarks !== undefined ? (remarks || null) : entry.remarks,
          },
          include: { createdBy: { select: { name: true } } },
        });
      }, { isolationLevel: 'Serializable' });
    } catch (txErr) {
      if (txErr.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: txErr.message });
      if (txErr.code === 'OVER_COMPLETION') return res.status(400).json({ success: false, message: txErr.message });
      throw txErr;
    }

    res.json({ success: true, data: updated, message: 'Entry updated.' });
  } catch (err) {
    console.error('[production.updateEntry]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// DELETE /api/production-entries/:id  (MANAGER only)
exports.deleteEntry = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const entry = await prisma.productionEntry.findUnique({
      where: { id },
      include: { challanItem: { select: { jobCardId: true, challanId: true } } },
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Production entry not found.' });

    await prisma.productionEntry.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: 'DELETE_PRODUCTION_ENTRY',
        tableName: 'production_entries',
        recordId: id,
        oldValues: {
          completedQty: Number(entry.completedQty),
          challanItemId: entry.challanItemId,
          jobCardId: entry.challanItem?.jobCardId,
        },
      },
    }).catch(() => {}); // Non-blocking — audit failure shouldn't fail delete

    res.json({ success: true, message: 'Entry deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/production-entries/job-card/:jobCardId/weight
// Update actualWeightUsed on a JobCard
exports.updateJobCardWeight = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const { actualWeightUsed } = req.body;

    const jobCard = await prisma.jobCard.findUnique({
      where: { id: jobCardId },
      include: {
        challanItemLinks: {
          include: {
            challan: { select: { id: true, inwardNo: true } },
          },
        },
      },
    });
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found.' });

    const weightToSet = actualWeightUsed !== undefined && actualWeightUsed !== null
      ? toNum(actualWeightUsed, null)
      : null;

    // Validate: totalConsumed of all job cards from same inward must not exceed inward total weight
    if (weightToSet !== null && jobCard.challanItemLinks.length > 0) {
      // Find all challan IDs this job card belongs to
      const challanIds = [...new Set(jobCard.challanItemLinks.map(ci => ci.challanId))];

      for (const challanId of challanIds) {
        const challan = await prisma.jobworkChallan.findUnique({
          where: { id: challanId },
          include: {
            items: {
              include: {
                jobCard: { select: { id: true, actualWeightUsed: true } },
              },
            },
          },
        });

        if (!challan) continue;

        // Use stored totalInwardWeight; fallback to sum(items.weight) for old data
        const inwardTotalWeight = Number(challan.totalInwardWeight || 0) ||
          challan.items.reduce((s, it) => s + Number(it.weight || 0), 0);

        // Sum of totalWeight across all OTHER job cards linked to this challan
        const linkedJCIds = new Set();
        challan.items.forEach(it => { if (it.jobCard?.id) linkedJCIds.add(it.jobCard.id); });

        const otherJCConsumed = await prisma.jobCard.aggregate({
          where: {
            id: { in: [...linkedJCIds].filter(jcId => jcId !== jobCardId) },
            totalWeight: { not: null },
          },
          _sum: { totalWeight: true },
        });

        const otherConsumed = Number(otherJCConsumed._sum.totalWeight || 0);
        const totalConsumed = otherConsumed + weightToSet;
        if (inwardTotalWeight > 0 && totalConsumed > inwardTotalWeight) {
          const available = Math.max(0, inwardTotalWeight - otherConsumed);
          return res.status(400).json({
            success: false,
            message: `Weight exceeds available balance. Inward total: ${inwardTotalWeight} kg, already consumed: ${otherConsumed.toFixed(3)} kg, available: ${available.toFixed(3)} kg. You entered: ${weightToSet.toFixed(3)} kg.`,
          });
        }
      }
    }

    const updated = await prisma.jobCard.update({
      where: { id: jobCardId },
      data: { totalWeight: weightToSet },
    });

    res.json({ success: true, data: { totalWeight: updated.totalWeight } });
  } catch (err) {
    console.error('[production.updateJobCardWeight]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/production-entries/inward/:challanId/weight-summary
// Returns inward total weight + consumed by each job card + remaining
exports.getWeightSummary = async (req, res) => {
  try {
    const challanId = toInt(req.params.challanId);

    const challan = await prisma.jobworkChallan.findUnique({
      where: { id: challanId },
      include: {
        items: {
          include: {
            jobCard: { select: { id: true, jobCardNo: true, totalWeight: true } },
          },
        },
      },
    });
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' });

    // Use stored totalInwardWeight; fallback to sum(items.weight) for old data
    const inwardTotalWeight = Number(challan.totalInwardWeight || 0) ||
      challan.items.reduce((s, it) => s + Number(it.weight || 0), 0);

    const jcMap = {};
    challan.items.forEach(it => {
      if (it.jobCard) jcMap[it.jobCard.id] = it.jobCard;
    });
    const jobCards = Object.values(jcMap);
    const consumedWeight = jobCards.reduce((s, jc) => s + Number(jc.totalWeight || 0), 0);
    const remainingWeight = Math.max(0, inwardTotalWeight - consumedWeight);

    res.json({
      success: true,
      data: {
        inwardTotalWeight,
        consumedWeight,
        remainingWeight,
        consumptionPct: inwardTotalWeight > 0
          ? Math.min(100, Number(((consumedWeight / inwardTotalWeight) * 100).toFixed(1)))
          : 0,
        fullyConsumed: inwardTotalWeight > 0 && consumedWeight >= inwardTotalWeight,
        jobCards: jobCards.map(jc => ({
          id: jc.id,
          jobCardNo: jc.jobCardNo,
          totalWeight: Number(jc.totalWeight || 0),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
