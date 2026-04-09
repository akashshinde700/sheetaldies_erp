const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');

const toDec = (v) => {
  const n = toNum(v, NaN);
  return Number.isFinite(n) ? n : null;
};

const normalizeDate = (d) => new Date(new Date(d).toISOString().slice(0, 10));

const sameDay = (dt, day) => dt.toISOString().slice(0, 10) === day.toISOString().slice(0, 10);

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

async function validateNoOverlap({ planDayId, machineId, startTime, endTime, excludeSlotId = null }) {
  const existing = await prisma.furnacePlanSlot.findMany({
    where: {
      planDayId,
      machineId,
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true, endNextDay: true },
    orderBy: { startTime: 'asc' },
  });

  for (const s of existing) {
    if (overlaps(startTime, endTime, s.startTime, s.endTime)) {
      return `Time clash with existing slot #${s.id}.`;
    }
  }
  return true;
}

exports.getDay = async (req, res) => {
  try {
    const dateStr = req.query.date;
    if (!dateStr) return res.status(400).json({ success: false, message: 'date (YYYY-MM-DD) is required.' });
    const planDate = normalizeDate(dateStr);

    const day = await prisma.furnacePlanDay.findUnique({
      where: { planDate },
      include: { slots: { include: { machine: true, jobCard: { include: { customer: true, part: true } }, processType: true }, orderBy: { startTime: 'asc' } } },
    });

    res.json({ success: true, data: day || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertDay = async (req, res) => {
  try {
    const { date, notes } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'date is required.' });
    const planDate = normalizeDate(date);

    const day = await prisma.furnacePlanDay.upsert({
      where: { planDate },
      update: { notes: notes || null },
      create: { planDate, notes: notes || null, createdById: req.user.id },
      include: { slots: true },
    });

    res.json({ success: true, data: day, message: 'Plan day saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.createSlot = async (req, res) => {
  try {
    const { date, machineId, jobCardId, processTypeId, startTime, endTime, endNextDay,
      tempC, holdMin, pressureBar, fanRpm, holdAtC, holdExtraMin, title, remarks, stage } = req.body;

    if (!date || !machineId || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'date, machineId, startTime, endTime are required.' });
    }

    const planDate = normalizeDate(date);
    const day = await prisma.furnacePlanDay.upsert({
      where: { planDate },
      update: {},
      create: { planDate, createdById: req.user.id },
    });

    const st = new Date(startTime);
    const et = new Date(endTime);
    if (!sameDay(st, planDate)) return res.status(400).json({ success: false, message: 'startTime must be on plan date.' });
    if (et <= st) return res.status(400).json({ success: false, message: 'endTime must be after startTime.' });

    const ok = await validateNoOverlap({ planDayId: day.id, machineId: toInt(machineId), startTime: st, endTime: et });
    if (ok !== true) return res.status(400).json({ success: false, message: ok });

    const slot = await prisma.furnacePlanSlot.create({
      data: {
        planDayId: day.id,
        machineId: toInt(machineId),
        jobCardId: jobCardId ? toInt(jobCardId) : null,
        processTypeId: processTypeId ? toInt(processTypeId) : null,
        stage: stage || 'HARDENING',
        startTime: st,
        endTime: et,
        endNextDay: endNextDay === true || endNextDay === 'true',
        tempC: toInt(tempC),
        holdMin: toInt(holdMin),
        pressureBar: toDec(pressureBar),
        fanRpm: toInt(fanRpm),
        holdAtC: toInt(holdAtC),
        holdExtraMin: toInt(holdExtraMin),
        title: title || null,
        remarks: remarks || null,
      },
      include: { machine: true, jobCard: { include: { customer: true, part: true } }, processType: true },
    });

    res.status(201).json({ success: true, data: slot, message: 'Slot created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.updateSlot = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const existing = await prisma.furnacePlanSlot.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Slot not found.' });

    const {
      machineId, jobCardId, processTypeId, startTime, endTime, endNextDay,
      tempC, holdMin, pressureBar, fanRpm, holdAtC, holdExtraMin, title, remarks, stage,
    } = req.body;

    const st = startTime ? new Date(startTime) : existing.startTime;
    const et = endTime ? new Date(endTime) : existing.endTime;
    if (et <= st) return res.status(400).json({ success: false, message: 'endTime must be after startTime.' });

    const mId = machineId ? toInt(machineId) : existing.machineId;
    const ok = await validateNoOverlap({ planDayId: existing.planDayId, machineId: mId, startTime: st, endTime: et, excludeSlotId: id });
    if (ok !== true) return res.status(400).json({ success: false, message: ok });

    const slot = await prisma.furnacePlanSlot.update({
      where: { id },
      data: {
        ...(machineId !== undefined && { machineId: toInt(machineId) }),
        ...(jobCardId !== undefined && { jobCardId: jobCardId ? toInt(jobCardId) : null }),
        ...(processTypeId !== undefined && { processTypeId: processTypeId ? toInt(processTypeId) : null }),
        ...(stage !== undefined && { stage }),
        ...(startTime !== undefined && { startTime: st }),
        ...(endTime !== undefined && { endTime: et }),
        ...(endNextDay !== undefined && { endNextDay: endNextDay === true || endNextDay === 'true' }),
        ...(tempC !== undefined && { tempC: toInt(tempC) }),
        ...(holdMin !== undefined && { holdMin: toInt(holdMin) }),
        ...(pressureBar !== undefined && { pressureBar: toDec(pressureBar) }),
        ...(fanRpm !== undefined && { fanRpm: toInt(fanRpm) }),
        ...(holdAtC !== undefined && { holdAtC: toInt(holdAtC) }),
        ...(holdExtraMin !== undefined && { holdExtraMin: toInt(holdExtraMin) }),
        ...(title !== undefined && { title: title || null }),
        ...(remarks !== undefined && { remarks: remarks || null }),
      },
      include: { machine: true, jobCard: { include: { customer: true, part: true } }, processType: true },
    });

    res.json({ success: true, data: slot, message: 'Slot updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.furnacePlanSlot.delete({ where: { id } });
    res.json({ success: true, message: 'Slot deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

