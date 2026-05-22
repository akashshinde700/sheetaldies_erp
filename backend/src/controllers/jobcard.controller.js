const fs    = require('fs');
const path  = require('path');
const prisma = require('../utils/prisma');
const { transaction } = require('../utils/transaction');
const { jobCardStatusBody, JOB_CARD_STATUSES } = require('../validation/schemas');
const { toInt, toNum } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');

const UPLOAD_BASE = path.join(__dirname, '../../uploads');

function deleteImageFile(urlPath) {
  if (!urlPath) return;
  const filename = path.basename(urlPath);
  const full = path.join(UPLOAD_BASE, 'jobcards', filename);
  fs.unlink(full, () => {}); // ignore errors (file may already be gone)
}

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

  // ✅ FIXED: Enhanced FK validation for inspection references
  // If transitioning to INSPECTION, must have inspection record for THIS job card
  if (newStatus === 'INSPECTION') {
    const inspection = await prisma.incomingInspection.findFirst({
      where: { 
        jobCardId: toInt(jobCardId),
        inspectionStatus: { not: 'PENDING' }, // Don't allow transition if no inspection done
      },
    });
    if (!inspection) {
      return 'Inspection record not found or not yet conducted. Cannot transition to INSPECTION state.';
    }
    // Validate inspection data integrity (FK check)
    const jobCard = await prisma.jobCard.findUnique({ where: { id: toInt(jobCardId) } });
    if (!jobCard) return 'Job card not found.';
    if (inspection.jobCardId !== jobCard.id) {
      return 'Inspection record does not match job card.';
    }
  }

  // ✅ FIXED: Enhanced validation for COMPLETED state
  // If transitioning to COMPLETED, must have passed inspection WITH valid data
  if (newStatus === 'COMPLETED') {
    const inspection = await prisma.incomingInspection.findFirst({
      where: { jobCardId: toInt(jobCardId) },
    });
    if (!inspection) {
      return 'Inspection record not found. Cannot complete job card.';
    }
    if (inspection.inspectionStatus !== 'PASS' && inspection.inspectionStatus !== 'CONDITIONAL') {
      return 'Inspection must be PASS or CONDITIONAL before completing job card.';
    }
    // Validate FK: ensure inspection belongs to this job card
    const jobCard = await prisma.jobCard.findUnique({ where: { id: toInt(jobCardId) } });
    if (!jobCard || inspection.jobCardId !== jobCard.id) {
      return 'Inspection validation failed - records mismatch.';
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
            woNo: card.woNo || null,
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
    const { status, search, fromDate, toDate } = req.query;
    const { page, limit, skip } = parsePagination(req);
    
    const where = {};
    if (status) where.status = status;
    const searchText = String(search || '').trim();
    if (searchText)  where.OR = [
      { jobCardNo: { contains: searchText, mode: 'insensitive' } },
      { part: { is: { partNo: { contains: searchText, mode: 'insensitive' } } } },
      { part: { is: { description: { contains: searchText, mode: 'insensitive' } } } },
      { operatorName: { contains: searchText, mode: 'insensitive' } },
    ];
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!Number.isNaN(from.getTime())) where.createdAt.gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!Number.isNaN(to.getTime())) {
          to.setDate(to.getDate() + 1);
          where.createdAt.lt = to;
        }
      }
    }

    const [cards, total] = await Promise.all([
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
        skip,
        take: limit,
      }),
      prisma.jobCard.count({ where }),
    ]);

    res.json(formatListResponse(cards, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Server error.'));
  }
};

// ── Get single Job Card ───────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id || id < 1) return res.status(400).json({ success: false, message: 'Invalid job card ID.' });
    const card = await prisma.jobCard.findUnique({
      where: { id },
      include: {
        part:     true,
        machine:  true,
        customer: { select: { id: true, name: true, address: true, city: true, state: true, pinCode: true } },
        createdBy: { select: { name: true, email: true } },
        inspection: {
          include: { processType: true, heatProcesses: true },
        },
        challans: {
          select: {
            id: true, challanNo: true, inwardNo: true, challanDate: true,
            toParty: { select: { name: true } },
            fromParty: { select: { name: true } },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        challanItemLinks: {
          include: {
            challan: { select: { id: true, challanNo: true, inwardNo: true, fromParty: { select: { name: true } } } },
          },
        },
        vhtRunsheetItems: {
          include: {
            runsheet: { select: { id: true, runsheetNumber: true, runDate: true, status: true } },
          },
        },
        testCertificates: {
          select: { id: true, certNo: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        parentJobCard: { select: { id: true, jobCardNo: true, quantity: true } },
        childJobCards: {
          select: { id: true, jobCardNo: true, quantity: true, status: true, remarks: true, hrcRange: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!card) return res.status(404).json({ success: false, message: 'Job card not found.' });

    // Derive flat runsheets array from vhtRunsheetItems for frontend compatibility
    const runsheets = card.vhtRunsheetItems
      .map(item => item.runsheet)
      .filter(Boolean)
      .filter((rs, idx, arr) => arr.findIndex(r => r.id === rs.id) === idx);

    res.json({ success: true, data: { ...card, runsheets } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Create Job Card ───────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { partId, operationNo, drawingNo, woNo, machineId, operatorName, quantity, startDate, endDate, remarks,
          dieNo, yourNo, heatNo, dieMaterial, customerId, receivedDate, dueDate, totalWeight, operationMode,
          issueDate, issueBy, specInstrCert, specInstrMPIRep, specInstrGraph,
          certificateNo, customerNameSnapshot, customerAddressSnapshot, factoryName, factoryAddress, contactEmail,
          dispatchByOurVehicle, dispatchByCourier, collectedByCustomer,
          hrcRange, specialRequirements, precautions, documentNo, revisionNo, revisionDate, pageNo,
          controlPlanNo, specification } = req.body;
    if (!partId || !quantity)
      return res.status(400).json({ success: false, code: 'ERR_VALIDATION', message: 'Part and quantity are required.' });

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
      woNo:         woNo         || null,
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
      controlPlanNo: controlPlanNo || null,
      specification: specification || null,
      createdById:  req.user.id,
    };

    // Add images if uploaded
    for (let i = 1; i <= 5; i++) {
      if (req.files && req.files[`image${i}`] && req.files[`image${i}`][0]) {
        cardData[`image${i}`] = `/uploads/jobcards/${req.files[`image${i}`][0].filename}`;
      }
    }

    // CRITICAL FIX: Wrap in transaction to ensure atomicity
    const card = await transaction(async (tx) => {
      return await tx.jobCard.create({
        data: cardData,
        include: { part: { select: { partNo: true, description: true } } },
      });
    });

    res.status(201).json({ success: true, data: card, message: `Job Card ${jobCardNo} created.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, code: 'ERR_INTERNAL', message: 'Failed to create job card. All changes have been rolled back.' });
  }
};

// ── Update Job Card ───────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { operationNo, drawingNo, woNo, machineId, operatorName, quantity, timeTaken, startDate, endDate, status, remarks,
            dieNo, yourNo, heatNo, dieMaterial, customerId, receivedDate, dueDate, totalWeight, operationMode,
            issueDate, issueBy, specInstrCert, specInstrMPIRep, specInstrGraph,
            certificateNo, customerNameSnapshot, customerAddressSnapshot, factoryName, factoryAddress, contactEmail,
            dispatchByOurVehicle, dispatchByCourier, collectedByCustomer,
            hrcRange, specialRequirements, precautions, documentNo, revisionNo, revisionDate, pageNo,
            controlPlanNo, specification } = req.body;

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
        ...(woNo         !== undefined && { woNo: woNo || null }),
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
        ...(controlPlanNo !== undefined && { controlPlanNo: controlPlanNo || null }),
        ...(specification !== undefined && { specification: specification || null }),
      };

    // Add images if uploaded; delete old file to free disk space
    if (req.files && Object.keys(req.files).length > 0) {
      const existing = await prisma.jobCard.findUnique({
        where: { id },
        select: { image1: true, image2: true, image3: true, image4: true, image5: true },
      });
      for (let i = 1; i <= 5; i++) {
        if (req.files[`image${i}`] && req.files[`image${i}`][0]) {
          deleteImageFile(existing?.[`image${i}`]);
          updateData[`image${i}`] = `/uploads/jobcards/${req.files[`image${i}`][0].filename}`;
        }
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

// ── Split Job Card ────────────────────────────────────────────
// POST /jobcards/:id/split
// Body: { splits: [{ quantity, remarks?, operatorName?, machineId?, hrcRange?, specialRequirements? }, ...] }
exports.split = async (req, res) => {
  try {
    const parentId = toInt(req.params.id);
    const { splits } = req.body;

    if (!Array.isArray(splits) || splits.length < 2) {
      return res.status(400).json({ success: false, message: 'Provide at least 2 split parts.' });
    }

    const parent = await prisma.jobCard.findUnique({
      where: { id: parentId },
      include: { part: true, machine: true, customer: true },
    });
    if (!parent) return res.status(404).json({ success: false, message: 'Parent job card not found.' });

    const totalSplitQty = splits.reduce((sum, s) => sum + toInt(s.quantity || 0), 0);
    if (totalSplitQty > parent.quantity) {
      return res.status(400).json({
        success: false,
        message: `Total split quantity (${totalSplitQty}) exceeds parent quantity (${parent.quantity}).`,
      });
    }

    const children = await transaction(async (tx) => {
      const created = [];
      for (const s of splits) {
        const qty = toInt(s.quantity);
        if (!qty || qty < 1) continue;
        const jobCardNo = await generateJobCardNo();
        const child = await tx.jobCard.create({
          data: {
            jobCardNo,
            parentJobCardId: parentId,
            partId:      parent.partId,
            customerId:  parent.customerId,
            dieNo:       parent.dieNo,
            yourNo:      parent.yourNo,
            heatNo:      parent.heatNo,
            dieMaterial: parent.dieMaterial,
            drawingNo:   parent.drawingNo,
            machineId:   s.machineId ? toInt(s.machineId) : parent.machineId,
            operatorName: s.operatorName || parent.operatorName || null,
            quantity:    qty,
            totalWeight: (parent.totalWeight && parent.quantity > 0) ? toNum(Number(parent.totalWeight) * qty / parent.quantity, null) : null,
            startDate:   parent.startDate,
            dueDate:     parent.dueDate,
            hrcRange:    s.hrcRange || parent.hrcRange || null,
            specialRequirements: s.specialRequirements || parent.specialRequirements || null,
            precautions: parent.precautions,
            customerNameSnapshot: parent.customerNameSnapshot,
            customerAddressSnapshot: parent.customerAddressSnapshot,
            factoryName: parent.factoryName,
            factoryAddress: parent.factoryAddress,
            contactEmail: parent.contactEmail,
            dispatchByOurVehicle: parent.dispatchByOurVehicle,
            dispatchByCourier: parent.dispatchByCourier,
            collectedByCustomer: parent.collectedByCustomer,
            documentNo: parent.documentNo,
            revisionNo: parent.revisionNo,
            remarks: s.remarks || null,
            status: 'CREATED',
            createdById: req.user.id,
          },
          include: { part: { select: { partNo: true, description: true } } },
        });
        created.push(child);
      }
      return created;
    });

    res.status(201).json({
      success: true,
      data: children,
      message: `Split into ${children.length} job cards: ${children.map(c => c.jobCardNo).join(', ')}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to split job card.' });
  }
};

// ── Dashboard Stats ───────────────────────────────────────────
// ── Certificate No Generator ──────────────────────────────────
// Format: YYMM + 3-digit sequence (resets each month, unique)
const generateCertificateNo = async (db = prisma) => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;

  const existing = await db.jobCard.findMany({
    where: { certificateNo: { startsWith: prefix } },
    select: { certificateNo: true },
  });

  let maxSeq = 0;
  for (const { certificateNo } of existing) {
    const seq = parseInt((certificateNo || '').slice(4), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  // Guard against collisions — increment until unique
  let seq = maxSeq + 1;
  while (seq <= 999) {
    const candidate = `${prefix}${String(seq).padStart(3, '0')}`;
    const clash = await db.jobCard.findFirst({ where: { certificateNo: candidate } });
    if (!clash) return candidate;
    seq += 1;
  }
  throw new Error('Could not generate unique certificate number for this month.');
};

exports.assignCertificateNo = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const jc = await prisma.jobCard.findUnique({ where: { id }, select: { id: true, certificateNo: true } });
    if (!jc) return res.status(404).json({ success: false, message: 'Job card not found.' });

    // Already assigned — return as-is (idempotent)
    if (jc.certificateNo) {
      return res.json({ success: true, data: { certificateNo: jc.certificateNo } });
    }

    const certNo = await generateCertificateNo();
    await prisma.jobCard.update({ where: { id }, data: { certificateNo: certNo } });
    return res.json({ success: true, data: { certificateNo: certNo } });
  } catch (err) {
    console.error('assignCertificateNo error:', err);
    res.status(500).json({ success: false, message: 'Could not assign certificate number.' });
  }
};

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

/** DELETE /jobcards/:id/image/:index — remove one image slot, delete file from disk */
exports.removeImage = async (req, res) => {
  try {
    const id    = toInt(req.params.id);
    const index = toInt(req.params.index);
    if (index < 1 || index > 5) {
      return res.status(400).json({ success: false, message: 'Image index must be 1–5.' });
    }
    const field = `image${index}`;
    const card = await prisma.jobCard.findUnique({ where: { id }, select: { [field]: true } });
    if (!card) return res.status(404).json({ success: false, message: 'Job card not found.' });

    deleteImageFile(card[field]);

    await prisma.jobCard.update({ where: { id }, data: { [field]: null } });
    res.json({ success: true, message: `Image ${index} removed.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteJobCard = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id || id < 1) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.jobCard.delete({ where: { id } });
    res.json({ success: true, message: 'Job card deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete job card.' });
  }
};
