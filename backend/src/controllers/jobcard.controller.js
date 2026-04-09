const prisma = require('../utils/prisma');
const { jobCardStatusBody, JOB_CARD_STATUSES } = require('../validation/schemas');
const { toInt, toNum } = require('../utils/normalize');

// ── Job Card Status Transitions ───────────────────────────────
// Valid transitions:
// CREATED → IN_PROGRESS or ON_HOLD
// IN_PROGRESS → SENT_FOR_JOBWORK  or ON_HOLD
// SENT_FOR_JOBWORK → INSPECTION or ON_HOLD
// INSPECTION → COMPLETED or SENT_FOR_JOBWORK or ON_HOLD (rework loop allowed)
// ON_HOLD → CREATED or IN_PROGRESS or SENT_FOR_JOBWORK
// COMPLETED → (no transitions allowed, only update remarks/endDate)
const validateStatusTransition = async (currentStatus, newStatus, jobCardId) => {
  if (currentStatus === newStatus) return true; // No change, allowed
  if (newStatus === 'ON_HOLD') return true;     // Can go ON_HOLD from any state

  const transitions = {
    CREATED: ['IN_PROGRESS'],
    IN_PROGRESS: ['SENT_FOR_JOBWORK'],
    SENT_FOR_JOBWORK: ['INSPECTION'],
    INSPECTION: ['COMPLETED', 'SENT_FOR_JOBWORK'],
    ON_HOLD: ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK'],
    COMPLETED: [],  // Terminal state
  };

  if (!transitions[currentStatus]?.includes(newStatus)) {
    return `Invalid transition from ${currentStatus} to ${newStatus}`;
  }

  // If transitioning to INSPECTION, must have inspection record
  if (newStatus === 'INSPECTION') {
    const inspection = await prisma.incomingInspection.findFirst({
      where: { jobCardId: toInt(jobCardId) },
    });
    if (!inspection) {
      return 'Inspection record not found. Cannot transition to INSPECTION state.';
    }
  }

  // If transitioning to COMPLETED, must have passed inspection
  if (newStatus === 'COMPLETED') {
    const inspection = await prisma.incomingInspection.findFirst({
      where: { jobCardId: toInt(jobCardId) },
    });
    if (!inspection || (inspection.inspectionStatus !== 'PASS' && inspection.inspectionStatus !== 'CONDITIONAL')) {
      return 'Inspection must be PASS or CONDITIONAL before completing job card.';
    }
  }

  return true;
};

const generateJobworkChallanNo = async (db = prisma) => {
  const y = new Date().getFullYear().toString().slice(-2);
  const yn = String(toInt(y, 0) + 1);
  const prefix = `SDT/JW/${y}-${yn}/`;

  const last = await db.jobworkChallan.findFirst({
    where: { challanNo: { startsWith: prefix } },
    orderBy: { challanNo: 'desc' },
  });

  let nextSerial = 1;
  if (last) {
    const parts = String(last.challanNo || '').split('/');
    nextSerial = (toInt(parts[parts.length - 1], 0) || 0) + 1;
  }

  while (nextSerial < 9999) {
    const challanNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    const exists = await db.jobworkChallan.findUnique({ where: { challanNo } });
    if (!exists) return challanNo;
    nextSerial += 1;
  }
  throw new Error('Could not generate unique jobwork challan number.');
};

const autoCreateJobworkChallanIfNeeded = async (jobCardId, createdById) => {
  const id = toInt(jobCardId);
  if (!id || !createdById) return;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.jobworkChallan.findFirst({
      where: { jobCardId: id },
      select: { id: true },
    });
    if (existing) return;

    const card = await tx.jobCard.findUnique({
      where: { id },
      include: { part: true },
    });
    if (!card) return;

    const parties = await tx.party.findMany({
      select: { id: true, name: true, partyType: true },
      orderBy: { id: 'asc' },
    });
    if (!parties.length) return;

    const lower = (v) => String(v || '').toLowerCase();
    const companyParty = parties.find((p) => lower(p.name).includes('sheetal dies'))
      || parties.find((p) => lower(p.name).includes('sheetal'))
      || parties[0];
    const vendorParty = parties.find((p) => p.partyType === 'VENDOR' && p.id !== companyParty.id)
      || parties.find((p) => p.partyType === 'BOTH' && p.id !== companyParty.id)
      || parties.find((p) => p.id !== companyParty.id)
      || companyParty;
    if (!companyParty || !vendorParty) return;

    const qty = toNum(card.quantity, 0);
    const challanNo = await generateJobworkChallanNo(tx);
    await tx.jobworkChallan.create({
      data: {
        challanNo,
        challanDate: new Date(),
        jobCardId: card.id,
        fromPartyId: companyParty.id,
        toPartyId: vendorParty.id,
        transportMode: 'Hand Delivery',
        processingNotes: 'Auto-created from job card status SENT_FOR_JOBWORK.',
        subtotal: 0,
        handlingCharges: 0,
        totalValue: 0,
        grandTotal: 0,
        createdById,
        items: {
          create: [{
            itemId: card.partId || null,
            description: card.part?.description || null,
            drawingNo: card.drawingNo || card.part?.drawingNo || null,
            material: card.dieMaterial || card.part?.material || null,
            hrc: card.hrcRange || null,
            woNo: card.jobCardNo || null,
            hsnCode: card.part?.hsnCode || null,
            quantity: qty > 0 ? qty : 1,
            uom: card.part?.unit || 'NOS',
            weight: card.totalWeight ? toNum(card.totalWeight, null) : null,
            rate: 0,
            amount: 0,
          }],
        },
      },
    });
  }, { isolationLevel: 'Serializable' });
};


// Auto-generate job card number: YYMMXXXX (e.g. 26030625)
// YY = last 2 digits of year, MM = month, XXXX = random 4 digits (unique)
const generateJobCardNo = async () => {
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(-2);           // "26"
  const mm  = String(now.getMonth() + 1).padStart(2, '0'); // "03"
  const prefix = `${yy}${mm}`;                              // "2603"

  // Keep generating until unique
  let jobCardNo;
  let attempts = 0;
  do {
    const rand = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit random: 1000-9999
    jobCardNo  = `${prefix}${rand}`;
    const exists = await prisma.jobCard.findUnique({ where: { jobCardNo } });
    if (!exists) break;
    attempts++;
  } while (attempts < 20);

  return jobCardNo;
};

// ── List Job Cards ────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search)  where.OR = [
      { jobCardNo:   { contains: search } },
      { part:        { partNo: { contains: search } } },
      { part:        { description: { contains: search } } },
      { operatorName:{ contains: search } },
    ];

    const [total, cards] = await Promise.all([
      prisma.jobCard.count({ where }),
      prisma.jobCard.findMany({
        where,
        include: {
          part:    { select: { partNo: true, description: true, material: true } },
          customer: { select: { id: true, name: true } },
          machine: { select: { code: true, name: true } },
          createdBy: { select: { name: true } },
          inspection: { select: { inspectionStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:  (toInt(page, 1) - 1) * toInt(limit, 20),
        take:  toInt(limit, 20),
      }),
    ]);

    res.json({ success: true, data: cards, meta: { total, page: toInt(page, 1), limit: toInt(limit, 20) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Get single Job Card ───────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const card = await prisma.jobCard.findUnique({
      where: { id: toInt(req.params.id) },
      include: {
        part:     true,
        machine:  true,
        customer: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
        inspection: {
          include: { processType: true, heatProcesses: true },
        },
        challans: {
          include: { toParty: { select: { name: true } } },
          orderBy:  { createdAt: 'desc' },
        },
      },
    });
    if (!card) return res.status(404).json({ success: false, message: 'Job card not found.' });
    res.json({ success: true, data: card });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Job Card ───────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { partId, operationNo, drawingNo, machineId, operatorName, quantity, startDate, endDate, remarks,
          dieNo, yourNo, heatNo, dieMaterial, customerId, receivedDate, dueDate, totalWeight, operationMode,
          issueDate, issueBy, specInstrCert, specInstrMPIRep, specInstrGraph,
          certificateNo, customerNameSnapshot, customerAddressSnapshot, factoryName, factoryAddress, contactEmail,
          dispatchByOurVehicle, dispatchByCourier, collectedByCustomer,
          hrcRange, specialRequirements, precautions, documentNo, revisionNo, revisionDate, pageNo } = req.body;
    if (!partId || !quantity)
      return res.status(400).json({ success: false, message: 'Part and quantity are required.' });

    const jobCardNo = await generateJobCardNo();

    const cardData = {
      jobCardNo,
      partId:       toInt(partId),
      dieNo:        dieNo        || null,
      yourNo:       yourNo       || null,
      heatNo:       heatNo       || null,
      dieMaterial:  dieMaterial  || null,
      customerId:   customerId   ? toInt(customerId) : null,
      operationNo:  operationNo  || null,
      drawingNo:    drawingNo    || null,
      machineId:    machineId    ? toInt(machineId) : null,
      operatorName: operatorName || null,
      quantity:     toInt(quantity),
      totalWeight:  totalWeight  ? toNum(totalWeight, null) : null,
      startDate:    startDate    ? new Date(startDate) : null,
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      dueDate:      dueDate      ? new Date(dueDate) : null,
      endDate:      endDate      ? new Date(endDate)   : null,
      issueDate:    issueDate    ? new Date(issueDate) : null,
      issueBy:      issueBy      || null,
      certificateNo: certificateNo || null,
      customerNameSnapshot: customerNameSnapshot || null,
      customerAddressSnapshot: customerAddressSnapshot || null,
      factoryName: factoryName || null,
      factoryAddress: factoryAddress || null,
      contactEmail: contactEmail || null,
      dispatchByOurVehicle: dispatchByOurVehicle === 'true' || dispatchByOurVehicle === true,
      dispatchByCourier: dispatchByCourier === 'true' || dispatchByCourier === true,
      collectedByCustomer: collectedByCustomer === 'true' || collectedByCustomer === true,
      hrcRange: hrcRange || null,
      specialRequirements: specialRequirements || null,
      precautions: precautions || null,
      documentNo: documentNo || null,
      revisionNo: revisionNo || null,
      revisionDate: revisionDate ? new Date(revisionDate) : null,
      pageNo: pageNo || null,
      operationMode: operationMode || null,
      remarks:      remarks      || null,
      specInstrCert: specInstrCert === 'true' || specInstrCert === true,
      specInstrMPIRep: specInstrMPIRep === 'true' || specInstrMPIRep === true,
      specInstrGraph: specInstrGraph === 'true' || specInstrGraph === true,
      createdById:  req.user.id,
    };

    // Add images if uploaded
    for (let i = 1; i <= 5; i++) {
      if (req.files && req.files[`image${i}`] && req.files[`image${i}`][0]) {
        cardData[`image${i}`] = `/uploads/jobcards/${req.files[`image${i}`][0].filename}`;
      }
    }

    const card = await prisma.jobCard.create({
      data: cardData,
      include: { part: { select: { partNo: true, description: true } } },
    });

    res.status(201).json({ success: true, data: card, message: `Job Card ${jobCardNo} created.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Update Job Card ───────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { operationNo, drawingNo, machineId, operatorName, quantity, timeTaken, startDate, endDate, status, remarks,
            dieNo, yourNo, heatNo, dieMaterial, customerId, receivedDate, dueDate, totalWeight, operationMode,
            issueDate, issueBy, specInstrCert, specInstrMPIRep, specInstrGraph,
            certificateNo, customerNameSnapshot, customerAddressSnapshot, factoryName, factoryAddress, contactEmail,
            dispatchByOurVehicle, dispatchByCourier, collectedByCustomer,
            hrcRange, specialRequirements, precautions, documentNo, revisionNo, revisionDate, pageNo } = req.body;

    // ── Status Transition Validation ──
    if (status !== undefined) {
      if (!JOB_CARD_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status "${status}". Allowed: ${JOB_CARD_STATUSES.join(', ')}` });
      }
      const currentCard = await prisma.jobCard.findUnique({ where: { id } });
      if (!currentCard) {
        return res.status(404).json({ success: false, message: 'Job card not found.' });
      }
      
      const validationResult = await validateStatusTransition(currentCard.status, status, id);
      if (validationResult !== true) {
        return res.status(400).json({ success: false, message: validationResult });
      }
    }

    const updateData = {
        ...(dieNo        !== undefined && { dieNo:       dieNo || null }),
        ...(yourNo       !== undefined && { yourNo:      yourNo || null }),
        ...(heatNo       !== undefined && { heatNo:      heatNo || null }),
        ...(dieMaterial  !== undefined && { dieMaterial: dieMaterial || null }),
        ...(customerId   !== undefined && { customerId:  customerId ? toInt(customerId) : null }),
        ...(operationNo  !== undefined && { operationNo }),
        ...(drawingNo    !== undefined && { drawingNo }),
        ...(machineId    !== undefined && { machineId: machineId ? toInt(machineId) : null }),
        ...(operatorName !== undefined && { operatorName }),
        ...(quantity     !== undefined && { quantity: toInt(quantity) }),
        ...(totalWeight  !== undefined && { totalWeight: totalWeight ? toNum(totalWeight, null) : null }),
        ...(timeTaken    !== undefined && { timeTaken: toNum(timeTaken, null) }),
        ...(startDate    !== undefined && { startDate:    startDate    ? new Date(startDate)    : null }),
        ...(receivedDate !== undefined && { receivedDate: receivedDate ? new Date(receivedDate) : null }),
        ...(dueDate      !== undefined && { dueDate:      dueDate      ? new Date(dueDate)      : null }),
        ...(endDate      !== undefined && { endDate:      endDate      ? new Date(endDate)      : null }),
        ...(issueDate    !== undefined && { issueDate:    issueDate    ? new Date(issueDate)    : null }),
        ...(issueBy      !== undefined && { issueBy:      issueBy      || null }),
        ...(certificateNo !== undefined && { certificateNo: certificateNo || null }),
        ...(customerNameSnapshot !== undefined && { customerNameSnapshot: customerNameSnapshot || null }),
        ...(customerAddressSnapshot !== undefined && { customerAddressSnapshot: customerAddressSnapshot || null }),
        ...(factoryName !== undefined && { factoryName: factoryName || null }),
        ...(factoryAddress !== undefined && { factoryAddress: factoryAddress || null }),
        ...(contactEmail !== undefined && { contactEmail: contactEmail || null }),
        ...(dispatchByOurVehicle !== undefined && { dispatchByOurVehicle: dispatchByOurVehicle === 'true' || dispatchByOurVehicle === true }),
        ...(dispatchByCourier !== undefined && { dispatchByCourier: dispatchByCourier === 'true' || dispatchByCourier === true }),
        ...(collectedByCustomer !== undefined && { collectedByCustomer: collectedByCustomer === 'true' || collectedByCustomer === true }),
        ...(hrcRange !== undefined && { hrcRange: hrcRange || null }),
        ...(specialRequirements !== undefined && { specialRequirements: specialRequirements || null }),
        ...(precautions !== undefined && { precautions: precautions || null }),
        ...(documentNo !== undefined && { documentNo: documentNo || null }),
        ...(revisionNo !== undefined && { revisionNo: revisionNo || null }),
        ...(revisionDate !== undefined && { revisionDate: revisionDate ? new Date(revisionDate) : null }),
        ...(pageNo !== undefined && { pageNo: pageNo || null }),
        ...(status        !== undefined && { status }),
        ...(remarks       !== undefined && { remarks }),
        ...(operationMode !== undefined && { operationMode: operationMode || null }),
        ...(specInstrCert !== undefined && { specInstrCert: specInstrCert === 'true' || specInstrCert === true }),
        ...(specInstrMPIRep !== undefined && { specInstrMPIRep: specInstrMPIRep === 'true' || specInstrMPIRep === true }),
        ...(specInstrGraph !== undefined && { specInstrGraph: specInstrGraph === 'true' || specInstrGraph === true }),
      };

    // Add images if uploaded
    for (let i = 1; i <= 5; i++) {
      if (req.files && req.files[`image${i}`] && req.files[`image${i}`][0]) {
        updateData[`image${i}`] = `/uploads/jobcards/${req.files[`image${i}`][0].filename}`;
      }
    }

    const card = await prisma.jobCard.update({
      where: { id },
      data: updateData,
    });
    if (updateData.status === 'SENT_FOR_JOBWORK') {
      await autoCreateJobworkChallanIfNeeded(id, req.user.id);
    }
    res.json({ success: true, data: card, message: 'Job card updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/** PATCH body: `{ status }` only — no multipart (for list / quick updates). */
exports.patchStatus = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { error, value } = jobCardStatusBody.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const { status } = value;

    const currentCard = await prisma.jobCard.findUnique({ where: { id } });
    if (!currentCard) {
      return res.status(404).json({ success: false, message: 'Job card not found.' });
    }

    const validationResult = await validateStatusTransition(currentCard.status, status, id);
    if (validationResult !== true) {
      return res.status(400).json({ success: false, message: validationResult });
    }

    const card = await prisma.jobCard.update({
      where: { id },
      data: { status },
    });
    if (status === 'SENT_FOR_JOBWORK') {
      await autoCreateJobworkChallanIfNeeded(id, req.user.id);
    }
    res.json({ success: true, data: card, message: 'Status updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Dashboard Stats ───────────────────────────────────────────
exports.stats = async (req, res) => {
  try {
    const [total, inProgress, sentForJobwork, completed, onHold, quality] = await Promise.all([
      prisma.jobCard.count(),
      prisma.jobCard.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.jobCard.count({ where: { status: 'SENT_FOR_JOBWORK' } }),
      prisma.jobCard.count({ where: { status: 'COMPLETED' } }),
      prisma.jobCard.count({ where: { status: 'ON_HOLD' } }),
      prisma.incomingInspection.count({ where: { inspectionStatus: 'FAIL' } }),
    ]);
    res.json({ success: true, data: { total, inProgress, sentForJobwork, completed, onHold, qualityAlerts: quality } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
