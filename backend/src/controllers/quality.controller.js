const prisma = require('../utils/prisma');
const path = require('path');
const { findRunsheetGraphForJobCard } = require('../utils/runsheetGraph');
const { toInt, toNum } = require('../utils/normalize');

function normalizeTempCycleArray(raw) {
  if (raw == null) return null;
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  return Array.isArray(v) && v.length ? v : null;
}

async function attachEffectiveTempCycle(cert) {
  const saved = normalizeTempCycleArray(cert.tempCycleData);
  if (saved?.length) {
    return {
      ...cert,
      effectiveTempCycleData: saved,
      graphSource: 'certificate',
      graphFromRunsheet: null,
    };
  }
  if (!cert.jobCardId) {
    return {
      ...cert,
      effectiveTempCycleData: null,
      graphSource: null,
      graphFromRunsheet: null,
    };
  }
  const fb = await findRunsheetGraphForJobCard(prisma, cert.jobCardId);
  if (fb) {
    return {
      ...cert,
      effectiveTempCycleData: fb.points,
      graphSource: 'vht_runsheet',
      graphFromRunsheet: fb.runsheet,
    };
  }
  return {
    ...cert,
    effectiveTempCycleData: null,
    graphSource: null,
    graphFromRunsheet: null,
  };
}

// Helper: extract image paths from multer fields
const getImagePaths = (files) => {
  const images = {};
  for (let i = 1; i <= 5; i++) {
    const key = `image${i}`;
    if (files && files[key] && files[key][0]) {
      // Store relative path for serving
      images[key] = `/uploads/inspections/${files[key][0].filename}`;
    } else {
      images[key] = null;
    }
  }
  return images;
};

// ── Create / Update Incoming Inspection ──────────────────────
exports.upsertInspection = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);

    // Verify job card exists
    const jobCard = await prisma.jobCard.findUnique({ where: { id: jobCardId } });
    if (!jobCard)
      return res.status(404).json({ success: false, message: 'Job card not found.' });

    const {
      catNormal, catWelded, catCrackRisk, catDistortionRisk,
      catCriticalFinishing, catDentDamage, catRusty, catCavity, catOthers, otherDefects,
      processTypeId,
      procStressRelieving, procHardening, procTempering, procAnnealing, procBrazing, procPlasmaNitriding, procNitriding, procSubZero, procSoakClean, procSlowCool,
      visualBefore, visualAfter,
      mpiBefore, mpiAfter, mpiNil,
      requiredHardnessMin, requiredHardnessMax, hardnessUnit, achievedHardness,
      hardnessAfter1, hardnessAfter2, hardnessAfter3, hardnessAfter4,
      distortionBefore, distortionAfter,
      urgent,
      packedQty, packedBy, incomingInspectionBy, finalInspectionBy,
      inspectedBy, inspectionDate, remarks, inspectionStatus,
    } = req.body;

    const images = getImagePaths(req.files);
    const b = (v) => v === 'true' || v === true;

    const data = {
      catNormal:            b(catNormal),
      catWelded:            b(catWelded),
      catCrackRisk:         b(catCrackRisk),
      catDistortionRisk:    b(catDistortionRisk),
      catCriticalFinishing: b(catCriticalFinishing),
      catDentDamage:        b(catDentDamage),
      catRusty:             b(catRusty),
      catCavity:            b(catCavity),
      catOthers:            b(catOthers),
      otherDefects:         otherDefects || null,
      processTypeId:       processTypeId       ? toInt(processTypeId) : null,
      procStressRelieving: b(procStressRelieving),
      procHardening:       b(procHardening),
      procTempering:       b(procTempering),
      procAnnealing:       b(procAnnealing),
      procBrazing:         b(procBrazing),
      procPlasmaNitriding: b(procPlasmaNitriding),
      procNitriding:       b(procNitriding),
      procSubZero:         b(procSubZero),
      procSoakClean:       b(procSoakClean),
      procSlowCool:        b(procSlowCool),
      visualBefore:        b(visualBefore),
      visualAfter:         b(visualAfter),
      mpiBefore:           b(mpiBefore),
      mpiAfter:            b(mpiAfter),
      mpiNil:              b(mpiNil),
      requiredHardnessMin: requiredHardnessMin ? toNum(requiredHardnessMin, null) : null,
      requiredHardnessMax: requiredHardnessMax ? toNum(requiredHardnessMax, null) : null,
      hardnessUnit:        hardnessUnit        || 'HRC',
      achievedHardness:    achievedHardness    ? toNum(achievedHardness, null)    : null,
      hardnessAfter1:      hardnessAfter1      ? toNum(hardnessAfter1, null)      : null,
      hardnessAfter2:      hardnessAfter2      ? toNum(hardnessAfter2, null)      : null,
      hardnessAfter3:      hardnessAfter3      ? toNum(hardnessAfter3, null)      : null,
      hardnessAfter4:      hardnessAfter4      ? toNum(hardnessAfter4, null)      : null,
      distortionBefore:    distortionBefore    ? (typeof distortionBefore === 'string' ? JSON.parse(distortionBefore) : distortionBefore) : null,
      distortionAfter:     distortionAfter     ? (typeof distortionAfter  === 'string' ? JSON.parse(distortionAfter)  : distortionAfter)  : null,
      urgent:              b(urgent),
      packedQty:            packedQty            ? toInt(packedQty)    : null,
      packedBy:             packedBy             || null,
      incomingInspectionBy: incomingInspectionBy || null,
      finalInspectionBy:    finalInspectionBy    || null,
      inspectedBy:          inspectedBy          || null,
      inspectionDate:       inspectionDate       ? new Date(inspectionDate) : null,
      remarks:              remarks              || null,
      inspectionStatus:     inspectionStatus     || 'PENDING',
      // Only update images if new ones were uploaded
      ...(images.image1 && { image1: images.image1 }),
      ...(images.image2 && { image2: images.image2 }),
      ...(images.image3 && { image3: images.image3 }),
      ...(images.image4 && { image4: images.image4 }),
      ...(images.image5 && { image5: images.image5 }),
    };

    const inspection = await prisma.incomingInspection.upsert({
      where:  { jobCardId },
      update: data,
      create: { jobCardId, ...data },
      include: { processType: true },
    });

    // Upsert heat treatment process rows
    const { heatProcesses } = req.body;
    if (heatProcesses !== undefined) {
      const rows = typeof heatProcesses === 'string' ? JSON.parse(heatProcesses) : heatProcesses;
      // Delete old rows
      await prisma.heatTreatmentProcess.deleteMany({ where: { inspectionId: inspection.id } });
      // Create new rows
      if (Array.isArray(rows) && rows.length > 0) {
        await prisma.heatTreatmentProcess.createMany({
          data: rows.map(r => ({
            inspectionId:  inspection.id,
            processTypeId: r.processTypeId ? toInt(r.processTypeId) : null,
            equipment:     r.equipment     || null,
            cycleNo:       r.cycleNo       ? toInt(r.cycleNo)       : null,
            tempTime:      r.tempTime      || null,
            tempFrom:      r.tempFrom      ? toNum(r.tempFrom, null)    : null,
            tempTo:        r.tempTo        ? toNum(r.tempTo, null)      : null,
            holdTimeMin:   r.holdTimeMin   ? toInt(r.holdTimeMin)   : null,
            startTime:     r.startTime     ? new Date(r.startTime)     : null,
            endTime:       r.endTime       ? new Date(r.endTime)       : null,
            processDate:   r.processDate   ? new Date(r.processDate)   : null,
            loadingBy:     r.loadingBy     || null,
            atmosphere:    r.atmosphere    || null,
            uom:           r.uom           || null,
            result:        r.result        || null,
            signedBy:      r.signedBy      || null,
          })),
        });
      }
    }

    // Update job card status to INSPECTION
    await prisma.jobCard.update({
      where: { id: jobCardId },
      data:  { status: 'INSPECTION' },
    });

    res.json({ success: true, data: inspection, message: 'Inspection saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Get Inspection for a Job Card ─────────────────────────────
exports.getInspection = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const inspection = await prisma.incomingInspection.findUnique({
      where:   { jobCardId },
      include: { processType: true, heatProcesses: { include: { processType: true } } },
    });
    if (!inspection)
      return res.status(404).json({ success: false, message: 'No inspection found for this job card.' });
    res.json({ success: true, data: inspection });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Test Certificates ─────────────────────────────────────────

const generateCertNo = async () => {
  const year   = new Date().getFullYear();
  const prefix = `SVT-${year}-`;

  const last = await prisma.testCertificate.findFirst({
    where:   { certNo: { startsWith: prefix } },
    orderBy: { certNo: 'desc' },
  });

  let nextSerial = 1;
  if (last) {
    const parts = last.certNo.split('-');
    const lastSerial = toInt(parts[parts.length - 1], 0);
    nextSerial = lastSerial + 1;
  }

  let certNo;
  do {
    certNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    const exists = await prisma.testCertificate.findUnique({ where: { certNo } });
    if (!exists) break;
    nextSerial++;
  } while (nextSerial < 9999);

  return certNo;
};

exports.createCertificate = async (req, res) => {
  try {
    const {
      jobCardId, yourPoNo, yourPoDate, yourRefNo, issueNo, issueDate, checkedBy,
      customerId, issuedByPartyId,
      dieMaterial, operatorMode,
      specInstrCertificate, specInstrMpiReport, specInstrProcessGraph,
      deliveryDate, specialRequirements, precautions,
      catNormal, catCrackRisk, catDistortionRisk, catCriticalFinishing, catDentDamage, catCavity, catOthers,
      procStressRelieving, procHardening, procTempering, procAnnealing, procBrazing, procPlasmaNitriding, procSubZero, procSoakClean,
      hardnessMin, hardnessMax, hardnessUnit,
      tempCycleData, distortionBefore, distortionAfter,
      packedQty, packedBy, approvedBy,
      issuedTo, heatNo, dispatchMode, dispatchChallanNo, dispatchChallanDate, dispatchedThrough,
      items, inspectionResults, certHeatProcesses,
    } = req.body;
    const b = (v) => v === 'true' || v === true;

    const images = getImagePaths(req.files);

    if (!customerId)
      return res.status(400).json({ success: false, message: 'Customer is required.' });

    const certNo = await generateCertNo();

    const cert = await prisma.testCertificate.create({
      data: {
        certNo,
        jobCardId: jobCardId ? toInt(jobCardId) : null,
        yourPoNo:        yourPoNo        || null,
        yourPoDate:      yourPoDate      ? new Date(yourPoDate) : null,
        yourRefNo:       yourRefNo       || null,
        issueNo:         issueNo         || null,
        issueDate:       issueDate       ? new Date(issueDate) : new Date(),
        checkedBy:       checkedBy       || null,
        customerId:      toInt(customerId),
        issuedByPartyId: issuedByPartyId ? toInt(issuedByPartyId) : null,
        dieMaterial:     dieMaterial     || null,
        operatorMode:    operatorMode    || null,
        specInstrCertificate:  b(specInstrCertificate),
        specInstrMpiReport:    b(specInstrMpiReport),
        specInstrProcessGraph: b(specInstrProcessGraph),
        deliveryDate:    deliveryDate    ? new Date(deliveryDate) : null,
        specialRequirements: specialRequirements || null,
        precautions:     precautions     || null,
        catNormal:            b(catNormal),
        catCrackRisk:         b(catCrackRisk),
        catDistortionRisk:    b(catDistortionRisk),
        catCriticalFinishing: b(catCriticalFinishing),
        catDentDamage:        b(catDentDamage),
        catCavity:            b(catCavity),
        catOthers:            b(catOthers),
        procStressRelieving:  b(procStressRelieving),
        procHardening:        b(procHardening),
        procTempering:        b(procTempering),
        procAnnealing:        b(procAnnealing),
        procBrazing:          b(procBrazing),
        procPlasmaNitriding:  b(procPlasmaNitriding),
        procSubZero:          b(procSubZero),
        procSoakClean:        b(procSoakClean),
        hardnessMin:     hardnessMin     ? toNum(hardnessMin, null) : null,
        hardnessMax:    hardnessMax      ? toNum(hardnessMax, null) : null,
        hardnessUnit:   hardnessUnit     || 'HRC',
        tempCycleData:  tempCycleData    ? (typeof tempCycleData   === 'string' ? JSON.parse(tempCycleData)   : tempCycleData)   : null,
        distortionBefore:distortionBefore? (typeof distortionBefore === 'string' ? JSON.parse(distortionBefore): distortionBefore): null,
        distortionAfter: distortionAfter ? (typeof distortionAfter  === 'string' ? JSON.parse(distortionAfter) : distortionAfter) : null,
        heatProcessData: certHeatProcesses ? (typeof certHeatProcesses === 'string' ? JSON.parse(certHeatProcesses) : certHeatProcesses) : null,
        image1:         images.image1    || null,
        image2:         images.image2    || null,
        image3:         images.image3    || null,
        image4:         images.image4    || null,
        image5:         images.image5    || null,
        issuedTo:           issuedTo           || null,
        heatNo:             heatNo             || null,
        dispatchMode:       dispatchMode       || null,
        dispatchChallanNo:  dispatchChallanNo  || null,
        dispatchChallanDate: dispatchChallanDate ? new Date(dispatchChallanDate) : null,
        dispatchedThrough:  dispatchedThrough  || null,
        packedQty:      packedQty        ? toInt(packedQty)    : null,
        packedBy:       packedBy         || null,
        approvedBy:     approvedBy       || null,
        createdById:    req.user.id,
        // Nested items
        items: items ? {
          create: (typeof items === 'string' ? JSON.parse(items) : items).map(it => ({
            description:  it.description,
            quantity:     toInt(it.quantity),
            weightPerPc:  it.weightPerPc  ? toNum(it.weightPerPc, null) : null,
            totalWeight:  it.totalWeight  ? toNum(it.totalWeight, null) : null,
            samplingPlan: it.samplingPlan || null,
            remarks:      it.remarks      || null,
          })),
        } : undefined,
        inspectionResults: inspectionResults ? {
          create: (typeof inspectionResults === 'string' ? JSON.parse(inspectionResults) : inspectionResults).map(ir => ({
            inspectionType:  ir.inspectionType,
            parameter:       ir.parameter       || null,
            requiredValue:   ir.requiredValue   || null,
            achievedValue:   ir.achievedValue   || null,
            result:          ir.result          || 'OK',
            finalInspection: ir.finalInspection || null,
          })),
        } : undefined,
      },
      include: { items: true, inspectionResults: true, customer: true },
    });

    res.status(201).json({ success: true, data: cert, message: `Certificate ${certNo} created.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/** GET ?jobCardId= — curve for certificate form / Excel “Graphs” alignment */
exports.getSuggestedTempCycleForJobCard = async (req, res) => {
  try {
    const jobCardId = toInt(req.query.jobCardId);
    if (!jobCardId) {
      return res.status(400).json({ success: false, message: 'jobCardId query is required.' });
    }
    const row = await prisma.jobCard.findUnique({ where: { id: jobCardId }, select: { id: true, jobCardNo: true } });
    if (!row) return res.status(404).json({ success: false, message: 'Job card not found.' });

    const fb = await findRunsheetGraphForJobCard(prisma, jobCardId);
    if (!fb) {
      return res.json({
        success: true,
        data: { tempCycleData: null, runsheet: null, jobCardNo: row.jobCardNo },
      });
    }
    return res.json({
      success: true,
      data: {
        tempCycleData: fb.points,
        runsheet: fb.runsheet,
        jobCardNo: row.jobCardNo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.listCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [total, certs] = await Promise.all([
      prisma.testCertificate.count(),
      prisma.testCertificate.findMany({
        include: {
          jobCard:   { select: { jobCardNo: true } },
          customer:  { select: { name: true } },
          items:     true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:  (toInt(page, 1) - 1) * toInt(limit, 20),
        take:  toInt(limit, 20),
      }),
    ]);
    res.json({ success: true, data: certs, meta: { total } });
  } catch (err) {
    console.error('ListCertificates error:', err);
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

exports.getCertificate = async (req, res) => {
  try {
    const cert = await prisma.testCertificate.findUnique({
      where: { id: toInt(req.params.id) },
      include: {
        jobCard:           {
          include: {
            part: true,
            inspection: { include: { processType: true, heatProcesses: true } },
            customer: true,
          },
        },
        customer:          true,
        issuedByParty:     true,
        items:             true,
        inspectionResults: true,
        createdBy:         { select: { name: true } },
      },
    });
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    const enriched = await attachEffectiveTempCycle(cert);
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
