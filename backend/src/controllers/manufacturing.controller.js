const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');

function toDateOnly(input) {
  const x = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(x.getTime())) return new Date();
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
}

async function resolveRunsheetLine(line) {
  const qty = toInt(line.quantity);
  if (Number.isNaN(qty) || qty < 1) throw new Error('Invalid quantity on line.');

  if (line.jobCardId) {
    const jc = await prisma.jobCard.findUnique({
      where: { id: toInt(line.jobCardId) },
      include: { customer: true, part: true },
    });
    if (!jc) throw new Error(`Job card #${line.jobCardId} not found.`);
    const w =
      line.weightKg !== undefined && line.weightKg !== null && line.weightKg !== ''
        ? toNum(line.weightKg, null)
        : jc.totalWeight != null
          ? toNum(jc.totalWeight, null)
          : null;
    return {
      jobCardId: jc.id,
      itemId: jc.partId,
      customerName: (line.customerName && String(line.customerName).trim()) || jc.customerNameSnapshot || jc.customer?.name || null,
      jobDescription: (line.jobDescription && String(line.jobDescription).trim()) || jc.part?.description || null,
      materialGrade: (line.materialGrade && String(line.materialGrade).trim()) || jc.dieMaterial || jc.part?.material || null,
      hrcRequired: (line.hrcRequired && String(line.hrcRequired).trim()) || jc.hrcRange || null,
      quantity: qty,
      weightKg: w != null && !Number.isNaN(w) ? w : null,
      plannedSlot: line.plannedSlot ? String(line.plannedSlot).trim() : null,
    };
  }

  if (line.itemId) {
    const item = await prisma.item.findUnique({ where: { id: toInt(line.itemId) } });
    if (!item) throw new Error(`Item #${line.itemId} not found.`);
    const w =
      line.weightKg !== undefined && line.weightKg !== null && line.weightKg !== ''
        ? toNum(line.weightKg, null)
        : item.weightKg != null
          ? toNum(item.weightKg, null)
          : null;
    return {
      jobCardId: null,
      itemId: item.id,
      customerName: line.customerName ? String(line.customerName).trim() : null,
      jobDescription: (line.jobDescription && String(line.jobDescription).trim()) || item.description,
      materialGrade: (line.materialGrade && String(line.materialGrade).trim()) || item.material || null,
      hrcRequired: line.hrcRequired ? String(line.hrcRequired).trim() : null,
      quantity: qty,
      weightKg: w != null && !Number.isNaN(w) ? w : null,
      plannedSlot: line.plannedSlot ? String(line.plannedSlot).trim() : null,
    };
  }

  throw new Error('Each line must include jobCardId or itemId.');
}

function buildRunsheetHeaderPayload(body, opts = {}) {
  const payload = {
    batchId: body.batchId != null ? toInt(body.batchId) : null,
    furnaceId: toInt(body.furnaceId),
    runDate: toDateOnly(body.runDate),
    cycleEndTime: body.cycleEndTime || null,
    totalTimeDisplay: body.totalTimeDisplay || null,
    mrStart: body.mrStart != null ? toInt(body.mrStart) : null,
    mrEnd: body.mrEnd != null ? toInt(body.mrEnd) : null,
    totalMr: body.totalMr != null ? toInt(body.totalMr) : null,
    loadingOperatorName: body.loadingOperatorName || null,
    docRevNo: body.docRevNo || null,
    docEffectiveDate: body.docEffectiveDate ? toDateOnly(body.docEffectiveDate) : null,
    docPageOf: body.docPageOf || null,
    tempProfile: body.tempProfile || null,
    cycleTime: body.cycleTime != null ? toInt(body.cycleTime, 240) : 240,
    hardeningType: body.hardeningType || null,
    quenchPressureBar: body.quenchPressureBar != null ? toNum(body.quenchPressureBar, null) : null,
    fanRpm: body.fanRpm != null ? toInt(body.fanRpm) : null,
    fixturesPosition: body.fixturesPosition || null,
    tempGraphPoints: body.tempGraphPoints != null ? body.tempGraphPoints : null,
    operatorSign: body.operatorSign || null,
    supervisorSign: body.supervisorSign || null,
    supervisorVerifiedAt: body.supervisorVerifiedAt ? new Date(body.supervisorVerifiedAt) : null,
    verificationNote: body.verificationNote || null,
    status: body.status || 'PLANNED',
    actualOutput: body.actualOutput != null ? toInt(body.actualOutput) : null,
    remarks: body.remarks || null,
  };
  if (opts.runsheetNumber) payload.runsheetNumber = opts.runsheetNumber;
  if (opts.createdById) payload.createdById = opts.createdById;
  return payload;
}

// ── List Manufacturing Batches ────────────────────────────────
exports.listBatches = async (req, res) => {
  try {
    const { status = '', search = '', page = 1, limit = 20 } = req.query;
    const skip = (toInt(page, 1) - 1) * toInt(limit, 20);

    const where = {};
    if (status) where.status = status;
    if (search) where.batchNumber = { contains: search };

    const [batches, total] = await Promise.all([
      prisma.manufacturingBatch.findMany({
        where,
        include: {
          jobCards: { include: { jobCard: { select: { jobCardNo: true, status: true } } } },
          productionPlans: true,
          runsheets: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: toInt(limit, 20),
      }),
      prisma.manufacturingBatch.count({ where }),
    ]);

    res.json({ success: true, data: batches, total, page: toInt(page, 1), limit: toInt(limit, 20) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch batches.' });
  }
};

// ── Create Manufacturing Batch ────────────────────────────────
exports.createBatch = async (req, res) => {
  try {
    const { jobCardIds, batchDate, remarks } = req.body;

    if (!jobCardIds || jobCardIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least 1 job card required.' });
    }

    // Generate batch number
    const lastBatch = await prisma.manufacturingBatch.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { batchNumber: true },
    });

    const lastNum = lastBatch?.batchNumber ? toInt(lastBatch.batchNumber.split('/').pop(), 0) : 0;
    const batchNumber = `BATCH/${new Date().getFullYear()}/${String(lastNum + 1).padStart(4, '0')}`;

    const batch = await prisma.manufacturingBatch.create({
      data: {
        batchNumber,
        batchDate: batchDate ? new Date(batchDate) : new Date(),
        remarks: remarks || null,
        status: 'CREATED',
        createdById: req.user.id,
        jobCards: {
          create: jobCardIds.map(jobCardId => ({
            jobCard: { connect: { id: toInt(jobCardId) } },
          })),
        },
      },
      include: { jobCards: true, runsheets: true },
    });

    res.status(201).json({ success: true, data: batch, message: 'Batch created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create batch.' });
  }
};

// ── Create VHT Runsheet ───────────────────────────────────────
exports.createRunsheet = async (req, res) => {
  try {
    const body = req.body;
    const parsedItems = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;

    const lines = [];
    for (const row of parsedItems) {
      lines.push(await resolveRunsheetLine(row));
    }

    const lastRS = await prisma.vHTRunsheet.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { runsheetNumber: true },
    });

    const lastNum = lastRS?.runsheetNumber ? toInt(lastRS.runsheetNumber.split('/').pop(), 0) : 0;
    const runsheetNumber = `VHT/${new Date().getFullYear()}/${String(lastNum + 1).padStart(5, '0')}`;

    const header = buildRunsheetHeaderPayload(body, {
      runsheetNumber,
      createdById: req.user.id,
    });

    const runsheet = await prisma.vHTRunsheet.create({
      data: {
        ...header,
        items: { create: lines },
      },
      include: {
        batch: true,
        furnace: true,
        items: { include: { item: true, jobCard: { include: { customer: true, part: true } } } },
      },
    });

    res.status(201).json({ success: true, data: runsheet, message: 'VHT Run Sheet created.' });
  } catch (err) {
    console.error(err);
    const msg = err.message && err.message.includes('not found') ? err.message : 'Failed to create runsheet.';
    res.status(err.message && err.message.includes('not found') ? 400 : 500).json({ success: false, message: msg });
  }
};

// ── List VHT Run Sheets ───────────────────────────────────────
exports.listRunsheets = async (req, res) => {
  try {
    const { page = 1, limit = 20, furnaceId, status, from, to } = req.query;
    const p = Math.max(1, toInt(page, 1) || 1);
    const l = Math.min(100, Math.max(1, toInt(limit, 20) || 20));
    const skip = (p - 1) * l;
    const where = {};
    if (furnaceId) where.furnaceId = toInt(furnaceId);
    if (status) where.status = status;
    if (from || to) {
      where.runDate = {};
      if (from) where.runDate.gte = toDateOnly(from);
      if (to) where.runDate.lte = toDateOnly(to);
    }

    const [rows, total] = await Promise.all([
      prisma.vHTRunsheet.findMany({
        where,
        include: {
          furnace: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, batchNumber: true } },
          items: { include: { item: true, jobCard: { select: { jobCardNo: true } } } },
        },
        orderBy: [{ runDate: 'desc' }, { id: 'desc' }],
        skip,
        take: l,
      }),
      prisma.vHTRunsheet.count({ where }),
    ]);

    res.json({
      success: true,
      data: rows,
      total,
      page: p,
      limit: l,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to list run sheets.' });
  }
};

// ── Get one VHT Run Sheet ─────────────────────────────────────
exports.getRunsheet = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const rs = await prisma.vHTRunsheet.findUnique({
      where: { id },
      include: {
        batch: true,
        furnace: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: { include: { item: true, jobCard: { include: { customer: true, part: true } } } },
      },
    });
    if (!rs) return res.status(404).json({ success: false, message: 'Run sheet not found.' });
    res.json({ success: true, data: rs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load run sheet.' });
  }
};

// ── Update full VHT Run Sheet ─────────────────────────────────
exports.updateRunsheet = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const body = req.body;
    const parsedItems = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;

    const existing = await prisma.vHTRunsheet.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Run sheet not found.' });

    const lines = [];
    for (const row of parsedItems) {
      lines.push(await resolveRunsheetLine(row));
    }

    const header = buildRunsheetHeaderPayload(body, {});

    const runsheet = await prisma.$transaction(async (tx) => {
      await tx.vHTRunsheetItem.deleteMany({ where: { runsheetId: id } });
      return tx.vHTRunsheet.update({
        where: { id },
        data: {
          ...header,
          items: { create: lines },
        },
        include: {
          batch: true,
          furnace: true,
          items: { include: { item: true, jobCard: { include: { customer: true, part: true } } } },
        },
      });
    });

    res.json({ success: true, data: runsheet, message: 'VHT Run Sheet updated.' });
  } catch (err) {
    console.error(err);
    const msg = err.message && err.message.includes('not found') ? err.message : 'Failed to update runsheet.';
    res.status(err.message && err.message.includes('not found') ? 400 : 500).json({ success: false, message: msg });
  }
};

// ── Create Daily Production Plan ──────────────────────────────
exports.createProductionPlan = async (req, res) => {
  try {
    const { batchId, planDate, shifts } = req.body;

    if (!batchId || !planDate || !shifts) {
      return res.status(400).json({ success: false, message: 'Batch, date, and shifts required.' });
    }

    const plan = await prisma.productionPlan.create({
      data: {
        batchId: toInt(batchId),
        planDate: new Date(planDate),
        status: 'DRAFT',
        createdById: req.user.id,
        shifts: {
          create: shifts.map((shift, idx) => ({
            shiftNumber: idx + 1,
            startTime: new Date(shift.startTime),
            endTime: new Date(shift.endTime),
            machineryAssigned: shift.machineryAssigned || null,
            operatorAssigned: shift.operatorAssigned || null,
            plannedOutput: toInt(shift.plannedOutput || 0, 0),
          })),
        },
      },
      include: {
        batch: true,
        shifts: true,
      },
    });

    res.status(201).json({ success: true, data: plan, message: 'Production plan created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create production plan.' });
  }
};

// ── Get Machine Utilization Report ────────────────────────────
exports.getMachineUtilization = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: { plan: true },
    });

    const machineMap = {};
    shifts.forEach(shift => {
      const machine = shift.machineryAssigned || 'Unassigned';
      if (!machineMap[machine]) {
        machineMap[machine] = { totalHours: 0, activeHours: 0, idleHours: 0 };
      }
      const hours = 4;
      machineMap[machine].totalHours += hours;
      machineMap[machine].activeHours += shift.plannedOutput > 0 ? hours : 0;
      machineMap[machine].idleHours += shift.plannedOutput > 0 ? 0 : hours;
    });

    const utilization = Object.entries(machineMap).map(([machine, data]) => ({
      machine,
      totalHours: data.totalHours,
      activeHours: data.activeHours,
      idleHours: data.idleHours,
      utilizationPercent: data.totalHours > 0 ? Math.round((data.activeHours / data.totalHours) * 100) : 0,
    }));

    res.json({ success: true, data: utilization });
  } catch (err) {
    console.error('Machine Utilization Error:', err);
    res.status(500).json({ success: false, message: 'Failed to calculate utilization.' });
  }
};

// ── Get Idle Time Report ──────────────────────────────────────
exports.getIdleTimeReport = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: { plan: true },
    });

    const idleShifts = shifts
      .filter(shift => !shift.plannedOutput || shift.plannedOutput === 0)
      .map(shift => ({
        shiftDate: shift.plan?.planDate,
        shiftNumber: shift.shiftNumber,
        machine: shift.machineryAssigned || 'Unassigned',
        reason: shift.reason || 'Not documented',
        duration: 4,
      }));

    const totalIdleHours = idleShifts.length * 4;

    res.json({ success: true, data: { shifts: idleShifts, totalIdleHours } });
  } catch (err) {
    console.error('Idle Time Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch idle time report.' });
  }
};

// ── Plant Losses (Monthly) ────────────────────────────────────
exports.getPlantLossMonth = async (req, res) => {
  try {
    const year = toInt(req.query.year);
    const month = toInt(req.query.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year and month (1-12) are required.' });
    }

    const data = await prisma.plantLossMonth.findUnique({
      where: { year_month: { year, month } },
      include: { entries: { include: { machine: true } } },
    });

    if (!data) return res.json({ success: true, data: null });

    const entries = (data.entries || []).map((e) => {
      const available = toNum(e.availableHours, 0);
      const used = toNum(e.usedHours, 0);
      const loss = Math.max(0, available - used);
      const efficiency = available > 0 ? (used / available) * 100 : 0;
      return {
        ...e,
        furnaceLabel: e.machine ? `${e.machine.code} – ${e.machine.name}` : (e.furnaceName || '—'),
        lossHours: toNum(loss.toFixed(2), 0),
        efficiencyPercent: toNum(efficiency.toFixed(1), 0),
      };
    });

    const totalAvailable = entries.reduce((s, e) => s + toNum(e.availableHours, 0), 0);
    const totalUsed = entries.reduce((s, e) => s + toNum(e.usedHours, 0), 0);
    const totalLoss = Math.max(0, totalAvailable - totalUsed);
    const totalEff = totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0;

    res.json({
      success: true,
      data: {
        ...data,
        entries,
        totals: {
          totalAvailable: toNum(totalAvailable.toFixed(2), 0),
          totalUsed: toNum(totalUsed.toFixed(2), 0),
          totalLoss: toNum(totalLoss.toFixed(2), 0),
          efficiencyPercent: toNum(totalEff.toFixed(1), 0),
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertPlantLossMonth = async (req, res) => {
  try {
    const { year, month, notes, entries } = req.body;
    const y = toInt(year);
    const m = toInt(month);
    if (!y || !m || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'year and month (1-12) are required.' });
    }

    const parsedEntries = typeof entries === 'string' ? JSON.parse(entries) : (entries || []);

    const saved = await prisma.$transaction(async (tx) => {
      const monthRow = await tx.plantLossMonth.upsert({
        where: { year_month: { year: y, month: m } },
        update: { notes: notes || null },
        create: { year: y, month: m, notes: notes || null, createdById: req.user.id },
      });

      // Replace entries (simple + deterministic)
      await tx.plantLossEntry.deleteMany({ where: { monthId: monthRow.id } });

      if (Array.isArray(parsedEntries) && parsedEntries.length) {
        await tx.plantLossEntry.createMany({
          data: parsedEntries.map((e) => ({
            monthId: monthRow.id,
            machineId: e.machineId ? toInt(e.machineId) : null,
            furnaceName: e.furnaceName || null,
            availableHours: e.availableHours != null ? toNum(e.availableHours, 624) : 624,
            usedHours: e.usedHours != null ? toNum(e.usedHours, 0) : 0,
            loadingUnloadingMin: e.loadingUnloadingMin != null ? toNum(e.loadingUnloadingMin, null) : null,
            waitingCyclePrepHrs: e.waitingCyclePrepHrs != null ? toNum(e.waitingCyclePrepHrs, null) : null,
            waitingMaterialHrs: e.waitingMaterialHrs != null ? toNum(e.waitingMaterialHrs, null) : null,
            cleaningFurnaceHrs: e.cleaningFurnaceHrs != null ? toNum(e.cleaningFurnaceHrs, null) : null,
            breakdownMaintHrs: e.breakdownMaintHrs != null ? toNum(e.breakdownMaintHrs, null) : null,
            noPowerHrs: e.noPowerHrs != null ? toNum(e.noPowerHrs, null) : null,
            noMaterialHrs: e.noMaterialHrs != null ? toNum(e.noMaterialHrs, null) : null,
          })),
        });
      }

      return tx.plantLossMonth.findUnique({
        where: { id: monthRow.id },
        include: { entries: { include: { machine: true } } },
      });
    });

    res.json({ success: true, data: saved, message: 'Plant loss month saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const daysInMonth = (year, month1to12) => new Date(year, month1to12, 0).getDate();
const d0 = (v) => {
  const n = typeof v === 'number' ? v : toInt(v || 0, 0);
  return Number.isFinite(n) ? n : 0;
};

// ── Daily Idle Logs (Machine-wise) ────────────────────────────
exports.getDailyIdleSheet = async (req, res) => {
  try {
    const machineId = toInt(req.query.machineId);
    const year = toInt(req.query.year);
    const month = toInt(req.query.month);
    if (!machineId || !year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'machineId, year, month are required.' });
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month - 1, daysInMonth(year, month)));

    const logs = await prisma.dailyIdleLog.findMany({
      where: { machineId, logDate: { gte: start, lte: end } },
      orderBy: { logDate: 'asc' },
    });

    const map = new Map(logs.map(l => [l.logDate.toISOString().slice(0, 10), l]));
    const dim = daysInMonth(year, month);
    const days = Array.from({ length: dim }).map((_, i) => {
      const day = i + 1;
      const key = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
      const l = map.get(key);
      return {
        day,
        date: key,
        loadingUnloadingMin: l?.loadingUnloadingMin || 0,
        waitingCyclePrepMin: l?.waitingCyclePrepMin || 0,
        waitingMaterialMin: l?.waitingMaterialMin || 0,
        preventiveMaintMin: l?.preventiveMaintMin || 0,
        breakdownMaintMin: l?.breakdownMaintMin || 0,
        noPowerMin: l?.noPowerMin || 0,
        noMaterialMin: l?.noMaterialMin || 0,
        remarks: l?.remarks || '',
      };
    });

    const totalsMin = days.reduce((s, r) => ({
      loadingUnloadingMin: s.loadingUnloadingMin + d0(r.loadingUnloadingMin),
      waitingCyclePrepMin: s.waitingCyclePrepMin + d0(r.waitingCyclePrepMin),
      waitingMaterialMin: s.waitingMaterialMin + d0(r.waitingMaterialMin),
      preventiveMaintMin: s.preventiveMaintMin + d0(r.preventiveMaintMin),
      breakdownMaintMin: s.breakdownMaintMin + d0(r.breakdownMaintMin),
      noPowerMin: s.noPowerMin + d0(r.noPowerMin),
      noMaterialMin: s.noMaterialMin + d0(r.noMaterialMin),
    }), {
      loadingUnloadingMin: 0, waitingCyclePrepMin: 0, waitingMaterialMin: 0,
      preventiveMaintMin: 0, breakdownMaintMin: 0, noPowerMin: 0, noMaterialMin: 0,
    });

    const toHours = (min) => toNum((min / 60).toFixed(2), 0);
    const totalsHours = {
      loadingUnloadingHrs: toHours(totalsMin.loadingUnloadingMin),
      waitingCyclePrepHrs: toHours(totalsMin.waitingCyclePrepMin),
      waitingMaterialHrs: toHours(totalsMin.waitingMaterialMin),
      preventiveMaintHrs: toHours(totalsMin.preventiveMaintMin),
      breakdownMaintHrs: toHours(totalsMin.breakdownMaintMin),
      noPowerHrs: toHours(totalsMin.noPowerMin),
      noMaterialHrs: toHours(totalsMin.noMaterialMin),
      totalIdleHrs: toHours(
        totalsMin.loadingUnloadingMin +
        totalsMin.waitingCyclePrepMin +
        totalsMin.waitingMaterialMin +
        totalsMin.preventiveMaintMin +
        totalsMin.breakdownMaintMin +
        totalsMin.noPowerMin +
        totalsMin.noMaterialMin
      ),
    };

    res.json({ success: true, data: { machineId, year, month, days, totalsMin, totalsHours } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertDailyIdleSheet = async (req, res) => {
  try {
    const { machineId, year, month, days } = req.body;
    const mid = toInt(machineId);
    const y = toInt(year);
    const m = toInt(month);
    if (!mid || !y || !m || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'machineId, year, month are required.' });
    }
    const parsedDays = typeof days === 'string' ? JSON.parse(days) : (days || []);

    const dim = daysInMonth(y, m);
    const normalized = parsedDays
      .filter(d => d?.day >= 1 && d?.day <= dim)
      .map(d => {
        const date = new Date(Date.UTC(y, m - 1, toInt(d.day))).toISOString().slice(0, 10);
        return {
          date,
          loadingUnloadingMin: d0(d.loadingUnloadingMin),
          waitingCyclePrepMin: d0(d.waitingCyclePrepMin),
          waitingMaterialMin: d0(d.waitingMaterialMin),
          preventiveMaintMin: d0(d.preventiveMaintMin),
          breakdownMaintMin: d0(d.breakdownMaintMin),
          noPowerMin: d0(d.noPowerMin),
          noMaterialMin: d0(d.noMaterialMin),
          remarks: d.remarks ? String(d.remarks).slice(0, 300) : null,
        };
      });

    await prisma.$transaction(async (tx) => {
      // Replace month logs for this machine (simple + deterministic)
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m - 1, dim));
      await tx.dailyIdleLog.deleteMany({ where: { machineId: mid, logDate: { gte: start, lte: end } } });

      if (normalized.length) {
        await tx.dailyIdleLog.createMany({
          data: normalized.map(d => ({
            machineId: mid,
            logDate: new Date(d.date),
            loadingUnloadingMin: d.loadingUnloadingMin,
            waitingCyclePrepMin: d.waitingCyclePrepMin,
            waitingMaterialMin: d.waitingMaterialMin,
            preventiveMaintMin: d.preventiveMaintMin,
            breakdownMaintMin: d.breakdownMaintMin,
            noPowerMin: d.noPowerMin,
            noMaterialMin: d.noMaterialMin,
            remarks: d.remarks,
            createdById: req.user.id,
          })),
        });
      }
    });

    res.json({ success: true, message: 'Daily idle sheet saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Derive Monthly Plant Loss from Daily (raw → summary) ───────
exports.derivePlantLossFromDaily = async (req, res) => {
  try {
    const year = toInt(req.body.year);
    const month = toInt(req.body.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year and month (1-12) are required.' });
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month - 1, daysInMonth(year, month)));

    const logs = await prisma.dailyIdleLog.findMany({
      where: { logDate: { gte: start, lte: end } },
    });

    const byMachine = new Map();
    for (const l of logs) {
      const mid = l.machineId;
      if (!byMachine.has(mid)) {
        byMachine.set(mid, {
          machineId: mid,
          loadingUnloadingMin: 0,
          waitingCyclePrepMin: 0,
          waitingMaterialMin: 0,
          preventiveMaintMin: 0,
          breakdownMaintMin: 0,
          noPowerMin: 0,
          noMaterialMin: 0,
        });
      }
      const a = byMachine.get(mid);
      a.loadingUnloadingMin += l.loadingUnloadingMin || 0;
      a.waitingCyclePrepMin += l.waitingCyclePrepMin || 0;
      a.waitingMaterialMin += l.waitingMaterialMin || 0;
      a.preventiveMaintMin += l.preventiveMaintMin || 0;
      a.breakdownMaintMin += l.breakdownMaintMin || 0;
      a.noPowerMin += l.noPowerMin || 0;
      a.noMaterialMin += l.noMaterialMin || 0;
    }

    const toHrs = (min) => toNum((min / 60).toFixed(2), 0);

    const entries = Array.from(byMachine.values()).map((x) => {
      const lossHrs =
        toHrs(x.loadingUnloadingMin) +
        toHrs(x.waitingCyclePrepMin) +
        toHrs(x.waitingMaterialMin) +
        toHrs(x.preventiveMaintMin) +
        toHrs(x.breakdownMaintMin) +
        toHrs(x.noPowerMin) +
        toHrs(x.noMaterialMin);

      const available = 624; // default monthly available hours (as per sheet)
      const used = Math.max(0, available - lossHrs);

      return {
        machineId: x.machineId,
        availableHours: available,
        usedHours: toNum(used.toFixed(2), 0),
        loadingUnloadingMin: toNum(x.loadingUnloadingMin.toFixed(2), 0),
        waitingCyclePrepHrs: toHrs(x.waitingCyclePrepMin),
        waitingMaterialHrs: toHrs(x.waitingMaterialMin),
        cleaningFurnaceHrs: 0,
        breakdownMaintHrs: toHrs(x.breakdownMaintMin),
        noPowerHrs: toHrs(x.noPowerMin),
        noMaterialHrs: toHrs(x.noMaterialMin),
      };
    });

    // Save/replace monthly summary
    const saved = await prisma.$transaction(async (tx) => {
      const monthRow = await tx.plantLossMonth.upsert({
        where: { year_month: { year, month } },
        update: {},
        create: { year, month, createdById: req.user.id },
      });
      await tx.plantLossEntry.deleteMany({ where: { monthId: monthRow.id } });
      if (entries.length) {
        await tx.plantLossEntry.createMany({
          data: entries.map(e => ({
            monthId: monthRow.id,
            machineId: e.machineId,
            availableHours: e.availableHours,
            usedHours: e.usedHours,
            loadingUnloadingMin: e.loadingUnloadingMin,
            waitingCyclePrepHrs: e.waitingCyclePrepHrs,
            waitingMaterialHrs: e.waitingMaterialHrs,
            cleaningFurnaceHrs: e.cleaningFurnaceHrs,
            breakdownMaintHrs: e.breakdownMaintHrs,
            noPowerHrs: e.noPowerHrs,
            noMaterialHrs: e.noMaterialHrs,
          })),
        });
      }
      return tx.plantLossMonth.findUnique({ where: { id: monthRow.id }, include: { entries: { include: { machine: true } } } });
    });

    res.json({ success: true, data: saved, message: 'Monthly plant losses derived from daily logs.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Furnace Utilisation Statement (Shift-wise) ────────────────
exports.getFurnaceUtilizationDay = async (req, res) => {
  try {
    const machineId = toInt(req.query.machineId);
    const date = req.query.date;
    if (!machineId || !date) {
      return res.status(400).json({ success: false, message: 'machineId and date (YYYY-MM-DD) are required.' });
    }
    const d = new Date(date);
    const row = await prisma.furnaceUtilizationDay.findUnique({
      where: { machineId_utilDate: { machineId, utilDate: d } },
      include: { machine: true },
    });
    res.json({ success: true, data: row || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertFurnaceUtilizationDay = async (req, res) => {
  try {
    const { machineId, date, signedBy, remarks, shifts } = req.body;
    const mid = toInt(machineId);
    if (!mid || !date) {
      return res.status(400).json({ success: false, message: 'machineId and date are required.' });
    }
    const d = new Date(date);
    const s = typeof shifts === 'string' ? JSON.parse(shifts) : (shifts || {});
    const g = (x) => {
      const n = typeof x === 'number' ? x : toInt(x || 0, 0);
      return Number.isFinite(n) ? Math.max(0, n) : 0;
    };

    const payload = {
      shift1UsedMin: g(s.shift1UsedMin),
      shift2UsedMin: g(s.shift2UsedMin),
      shift3UsedMin: g(s.shift3UsedMin),
      s1A: g(s.s1A), s1B: g(s.s1B), s1C: g(s.s1C), s1D: g(s.s1D), s1E: g(s.s1E), s1F: g(s.s1F), s1G: g(s.s1G),
      s2A: g(s.s2A), s2B: g(s.s2B), s2C: g(s.s2C), s2D: g(s.s2D), s2E: g(s.s2E), s2F: g(s.s2F), s2G: g(s.s2G),
      s3A: g(s.s3A), s3B: g(s.s3B), s3C: g(s.s3C), s3D: g(s.s3D), s3E: g(s.s3E), s3F: g(s.s3F), s3G: g(s.s3G),
      signedBy: signedBy || null,
      remarks: remarks || null,
    };

    const saved = await prisma.furnaceUtilizationDay.upsert({
      where: { machineId_utilDate: { machineId: mid, utilDate: d } },
      update: payload,
      create: { machineId: mid, utilDate: d, ...payload, createdById: req.user.id },
      include: { machine: true },
    });

    res.json({ success: true, data: saved, message: 'Furnace utilisation saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Get Shift-wise Report ─────────────────────────────────────
exports.getShiftReport = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: { plan: true },
      orderBy: [{ plan: { planDate: 'desc' } }, { shiftNumber: 'asc' }],
    });

    res.json({ success: true, data: shifts });
  } catch (err) {
    console.error('Shift Report Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch shift report.' });
  }
};

// ── Update Runsheet Status ────────────────────────────────────
exports.updateRunsheetStatus = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const { status, actualOutput, remarks } = req.body;

    const runsheet = await prisma.vHTRunsheet.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(actualOutput !== undefined && { actualOutput: toInt(actualOutput) }),
        ...(remarks !== undefined && { remarks }),
      },
      include: { items: { include: { item: true, jobCard: { select: { jobCardNo: true } } } } },
    });

    res.json({ success: true, data: runsheet, message: 'Runsheet updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update runsheet.' });
  }
};

// ── Batch Completion Report ───────────────────────────────────
exports.getBatchReport = async (req, res) => {
  try {
    const batchId = toInt(req.params.batchId);
    if (Number.isNaN(batchId)) return res.status(400).json({ success: false, message: 'Invalid ID.' });

    const batch = await prisma.manufacturingBatch.findUnique({
      where: { id: batchId },
      include: {
        jobCards: { include: { jobCard: { select: { jobCardNo: true, status: true } } } },
        productionPlans: { include: { shifts: true } },
        runsheets: { include: { items: { include: { item: true } } } },
      },
    });

    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found.' });

    // Gather all shifts across all production plans
    const allShifts = batch.productionPlans?.flatMap(p => p.shifts || []) || [];
    const totalShifts = allShifts.length;
    const totalRuntime = totalShifts * 4;
    const idleShifts = allShifts.filter(s => !s.plannedOutput).length;

    res.json({
      success: true,
      data: {
        batch,
        summary: {
          totalJobCards: batch.jobCards.length,
          totalRunsheets: batch.runsheets.length,
          totalShifts,
          totalRuntime,
          idleShifts,
          utilizationPercent: totalRuntime > 0 ? Math.round(((totalRuntime - idleShifts * 4) / totalRuntime) * 100) : 0,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch batch report.' });
  }
};
