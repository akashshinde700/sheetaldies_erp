const prisma = require('../utils/prisma');
const path = require('path');
const { findRunsheetGraphForJobCard } = require('../utils/runsheetGraph');
const { toInt, toNum } = require('../utils/normalize');
const { parseJsonIfString } = require('../utils/json');
const { parseYMD, clip, finiteOrNull } = require('../utils/inputs');
const { parsePagination, formatListResponse, formatErrorResponse, getStatusCode } = require('../utils/validation');
const { canEditInspection, canViewInspection, hasRole } = require('../middleware/role');
const { log } = require('../utils/logger');
const fs = require('fs');

const CERT_UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads', 'inspections');

// Removed photo ki file bhi disk se hatao, warna uploads folder bhara rehta hai.
function deleteCertImage(urlPath) {
  if (!urlPath) return;
  const filename = path.basename(urlPath);
  if (!filename || filename === '.' || filename === '..') return;
  const full = path.resolve(CERT_UPLOAD_DIR, filename);
  if (!full.startsWith(CERT_UPLOAD_DIR + path.sep) && full !== CERT_UPLOAD_DIR) return;
  fs.unlink(full, () => {});
}

// Auto-determine inspection status from hardness values and defect categories
function autoCalcInspectionStatus(data) {
  const defectFlags = [
    data.catCrackRisk, data.catDistortionRisk, data.catDentDamage,
    data.catRusty, data.catCavity,
  ];
  if (defectFlags.some(Boolean)) return 'FAIL';

  const min = data.requiredHardnessMin;
  const max = data.requiredHardnessMax;
  const achieved = data.achievedHardness;

  if (achieved !== null && achieved !== undefined) {
    if (min !== null && min !== undefined && achieved < min) return 'FAIL';
    if (max !== null && max !== undefined && achieved > max) return 'FAIL';

    // Check individual readings
    const readings = [data.hardnessAfter1, data.hardnessAfter2, data.hardnessAfter3, data.hardnessAfter4]
      .filter(v => v !== null && v !== undefined);
    if (readings.length > 0) {
      const anyFail = readings.some(v =>
        (min !== null && min !== undefined && v < min) ||
        (max !== null && max !== undefined && v > max)
      );
      if (anyFail) return 'CONDITIONAL';
    }

    if (min !== null && max !== null && min !== undefined && max !== undefined) return 'PASS';
  }

  return 'PENDING';
}

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

// Certificate save arrives as multipart/FormData, so every field lands in
// req.body as a string — including unchecked boxes, sent as the string
// "false". `!!"false"` is true (any non-empty string is truthy), so a plain
// `!!` here would flip every unchecked box on. Match the boolean parsing
// used for the certificate's own fields elsewhere in this file.
const toBool = (v) => v === 'true' || v === true;

// Certificate categorization/process/visual/MPI fields are duplicated onto the
// linked job card's IncomingInspection so the two stay in sync in both
// directions: editing either one keeps the other current. Only fields that
// exist on both models are synced (IncomingInspection also has procNitriding
// and procSlowCool with no TestCertificate equivalent —
// those are left untouched).
async function syncCategorizationToJobCard(tx, jobCardId, f) {
  if (!jobCardId) return;
  const shared = {
    catNormal: toBool(f.catNormal), catWelded: toBool(f.catWelded), catRusty: toBool(f.catRusty),
    catCrackRisk: toBool(f.catCrackRisk), catDistortionRisk: toBool(f.catDistortionRisk),
    catCriticalFinishing: toBool(f.catCriticalFinishing), catDentDamage: toBool(f.catDentDamage),
    catCavity: toBool(f.catCavity), catOthers: toBool(f.catOthers),
    procStressRelieving: toBool(f.procStressRelieving), procHardening: toBool(f.procHardening),
    procTempering: toBool(f.procTempering), procAnnealing: toBool(f.procAnnealing), procBrazing: toBool(f.procBrazing),
    procPlasmaNitriding: toBool(f.procPlasmaNitriding), procSubZero: toBool(f.procSubZero), procSoakClean: toBool(f.procSoakClean),
    visualBefore: toBool(f.visualBefore), visualAfter: toBool(f.visualAfter),
    mpiBefore: toBool(f.mpiBefore), mpiAfter: toBool(f.mpiAfter), mpiNil: toBool(f.mpiNil),
  };
  await tx.incomingInspection.upsert({
    where: { jobCardId },
    update: shared,
    create: { jobCardId, ...shared },
  });
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

    // ✅ FIXED: Check if inspection exists and verify permission to edit
    const existingInspection = await prisma.incomingInspection.findUnique({
      where: { jobCardId },
    });
    if (existingInspection && !canEditInspection(req.user, existingInspection)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only edit your own inspections.' 
      });
    }

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

    // Validate JSON-string fields early (multipart/form-data can send JSON as strings)
    try {
      parseJsonIfString(distortionBefore, { fieldName: 'distortionBefore', defaultValue: null });
      parseJsonIfString(distortionAfter, { fieldName: 'distortionAfter', defaultValue: null });
    } catch (e) {
      if (e.code === 'INVALID_JSON') {
        return res.status(400).json({ success: false, code: e.code, message: e.message });
      }
      throw e;
    }

    const images = getImagePaths(req.files);
    const b = (v) => v === 'true' || v === true;

    // Partial update: only fields the caller actually sent are written. This
    // endpoint is called from two different pages (the Job Card edit form's
    // Inspection section, and the Job Card print page's inline-editable
    // fields) that each only know about their own subset of columns — e.g.
    // the print page never sends distortionBefore/After, and the edit form
    // never sends heatProcesses. Unconditionally writing every field (the
    // previous behaviour) meant whichever page saved last silently wiped
    // out the columns it doesn't track, e.g. print-page edits were erasing
    // the edit form's saved Distortion Measurements.
    const data = {
      ...(catNormal            !== undefined && { catNormal:            b(catNormal) }),
      ...(catWelded             !== undefined && { catWelded:            b(catWelded) }),
      ...(catCrackRisk         !== undefined && { catCrackRisk:         b(catCrackRisk) }),
      ...(catDistortionRisk    !== undefined && { catDistortionRisk:    b(catDistortionRisk) }),
      ...(catCriticalFinishing !== undefined && { catCriticalFinishing: b(catCriticalFinishing) }),
      ...(catDentDamage        !== undefined && { catDentDamage:        b(catDentDamage) }),
      ...(catRusty              !== undefined && { catRusty:             b(catRusty) }),
      ...(catCavity            !== undefined && { catCavity:            b(catCavity) }),
      ...(catOthers            !== undefined && { catOthers:            b(catOthers) }),
      ...(otherDefects         !== undefined && { otherDefects:         otherDefects || null }),
      ...(processTypeId        !== undefined && { processTypeId:        processTypeId ? toInt(processTypeId) : null }),
      ...(procStressRelieving  !== undefined && { procStressRelieving:  b(procStressRelieving) }),
      ...(procHardening        !== undefined && { procHardening:        b(procHardening) }),
      ...(procTempering        !== undefined && { procTempering:        b(procTempering) }),
      ...(procAnnealing        !== undefined && { procAnnealing:        b(procAnnealing) }),
      ...(procBrazing          !== undefined && { procBrazing:          b(procBrazing) }),
      ...(procPlasmaNitriding  !== undefined && { procPlasmaNitriding:  b(procPlasmaNitriding) }),
      ...(procNitriding        !== undefined && { procNitriding:        b(procNitriding) }),
      ...(procSubZero          !== undefined && { procSubZero:          b(procSubZero) }),
      ...(procSoakClean        !== undefined && { procSoakClean:        b(procSoakClean) }),
      ...(procSlowCool         !== undefined && { procSlowCool:         b(procSlowCool) }),
      ...(visualBefore         !== undefined && { visualBefore:         b(visualBefore) }),
      ...(visualAfter          !== undefined && { visualAfter:          b(visualAfter) }),
      ...(mpiBefore            !== undefined && { mpiBefore:            b(mpiBefore) }),
      ...(mpiAfter             !== undefined && { mpiAfter:             b(mpiAfter) }),
      ...(mpiNil               !== undefined && { mpiNil:               b(mpiNil) }),
      ...(requiredHardnessMin  !== undefined && { requiredHardnessMin:  requiredHardnessMin ? toNum(requiredHardnessMin, null) : null }),
      ...(requiredHardnessMax  !== undefined && { requiredHardnessMax:  requiredHardnessMax ? toNum(requiredHardnessMax, null) : null }),
      ...(hardnessUnit         !== undefined && { hardnessUnit:         hardnessUnit || 'HRC' }),
      ...(achievedHardness     !== undefined && { achievedHardness:     achievedHardness || null }),
      ...(hardnessAfter1       !== undefined && { hardnessAfter1:       hardnessAfter1 || null }),
      ...(hardnessAfter2       !== undefined && { hardnessAfter2:       hardnessAfter2 || null }),
      ...(hardnessAfter3       !== undefined && { hardnessAfter3:       hardnessAfter3 || null }),
      ...(hardnessAfter4       !== undefined && { hardnessAfter4:       hardnessAfter4 || null }),
      ...(distortionBefore     !== undefined && { distortionBefore:     parseJsonIfString(distortionBefore, { fieldName: 'distortionBefore', defaultValue: null }) }),
      ...(distortionAfter      !== undefined && { distortionAfter:      parseJsonIfString(distortionAfter, { fieldName: 'distortionAfter', defaultValue: null }) }),
      ...(urgent                !== undefined && { urgent:               b(urgent) }),
      ...(packedQty             !== undefined && { packedQty:            packedQty ? toInt(packedQty) : null }),
      ...(packedBy              !== undefined && { packedBy:             packedBy || null }),
      ...(incomingInspectionBy !== undefined && { incomingInspectionBy: incomingInspectionBy || null }),
      ...(finalInspectionBy    !== undefined && { finalInspectionBy:    finalInspectionBy || null }),
      ...(inspectedBy           !== undefined && { inspectedBy:          inspectedBy || null }),
      ...(inspectionDate       !== undefined && { inspectionDate:       inspectionDate ? new Date(inspectionDate) : null }),
      ...(remarks               !== undefined && { remarks:              remarks || null }),
      ...(inspectionStatus     !== undefined && { inspectionStatus:     inspectionStatus || 'PENDING' }),
      // Only update images if new ones were uploaded
      ...(images.image1 && { image1: images.image1 }),
      ...(images.image2 && { image2: images.image2 }),
      ...(images.image3 && { image3: images.image3 }),
      ...(images.image4 && { image4: images.image4 }),
      ...(images.image5 && { image5: images.image5 }),
    };

    // Auto-calculate inspection status if not explicitly provided — computed
    // against the existing record merged with this partial update, since
    // `data` alone may be missing fields (e.g. hardness) this particular
    // caller didn't send but that still matter for the calculation.
    if (!inspectionStatus || inspectionStatus === 'PENDING') {
      data.inspectionStatus = autoCalcInspectionStatus({ ...existingInspection, ...data });
    }

    const inspection = await prisma.incomingInspection.upsert({
      where:  { jobCardId },
      update: data,
      create: { jobCardId, ...data },
      include: { processType: true },
    });

    // Upsert heat treatment process rows
    const { heatProcesses } = req.body;
    if (heatProcesses !== undefined) {
      let rows;
      try {
        rows = parseJsonIfString(heatProcesses, { fieldName: 'heatProcesses', defaultValue: [] }) || [];
      } catch (e) {
        if (e.code === 'INVALID_JSON') {
          return res.status(400).json({ success: false, code: e.code, message: e.message });
        }
        throw e;
      }
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
    
    // ✅ FIXED: Verify user has permission to view this inspection
    if (!canViewInspection(req.user, inspection)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only view your own inspections.' 
      });
    }
    
    res.json({ success: true, data: inspection });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Test Certificates ─────────────────────────────────────────

const generateCertNo = async (preferred = null) => {
  if (preferred) {
    const exists = await prisma.testCertificate.findUnique({ where: { certNo: String(preferred) } });
    if (!exists) return String(preferred);
  }

  const now = new Date();
  const yy  = String(now.getFullYear()).slice(-2);
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;

  const last = await prisma.testCertificate.findFirst({
    where:   { certNo: { startsWith: prefix } },
    orderBy: { id: 'desc' },
    select:  { certNo: true },
  });

  let nextSeq = 101;
  if (last?.certNo) {
    const lastSeq = parseInt(String(last.certNo).slice(4), 10);
    if (!isNaN(lastSeq) && lastSeq >= 101) nextSeq = lastSeq + 1;
  }
  return `${prefix}${nextSeq}`;
};

// ── Get Pending-Cert Items for a Job Card ──────────────────────
exports.getPendingCertItems = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    if (!jobCardId) return res.status(400).json({ success: false, message: 'jobCardId required.' });

    const items = await prisma.challanItem.findMany({
      where: { jobCardId, certStatus: 'PENDING_CERT' },
      include: {
        challan: { select: { id: true, challanNo: true, inwardNo: true } },
      },
      orderBy: { id: 'asc' },
    });

    // Also fetch already-certified items (so the form can show them as disabled)
    const certifiedItems = await prisma.challanItem.findMany({
      where: { jobCardId, certStatus: 'CERTIFIED' },
      include: {
        certItems: {
          include: { cert: { select: { certNo: true, id: true } } },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    res.json({ success: true, data: { pendingItems: items, certifiedItems } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.createCertificate = async (req, res) => {
  try {
    const {
      jobCardId, yourPoNo, yourPoDate, yourRefNo, issueNo, issueDate, checkedBy,
      customerId, issuedByPartyId,
      dieMaterial, operatorMode,
      specInstrCertificate, specInstrMpiReport, specInstrProcessGraph,
      deliveryDate, specialRequirements, precautions,
      catNormal, catWelded, catRusty, catCrackRisk, catDistortionRisk, catCriticalFinishing, catDentDamage, catCavity, catOthers,
      procStressRelieving, procHardening, procTempering, procAnnealing, procBrazing, procPlasmaNitriding, procSubZero, procSoakClean,
      visualBefore, visualAfter, mpiBefore, mpiAfter, mpiNil,
      hardnessMin, hardnessMax, hardnessUnit, achievedHardness,
      hardnessAfter1, hardnessAfter2, hardnessAfter3, hardnessAfter4,
      tempCycleData, tempCycleTemplateId, distortionBefore, distortionAfter,
      packedQty, packedBy, approvedBy, finalInspectionBy,
      issuedTo, heatNo, dispatchMode, dispatchChallanNo, dispatchChallanDate, dispatchedThrough,
      remarks,
      items, inspectionResults, certHeatProcesses, selectedChallanItemIds,
    } = req.body;
    const b = (v) => v === 'true' || v === true;

    const images = getImagePaths(req.files);

    if (!customerId)
      return res.status(400).json({ success: false, message: 'Customer is required.' });

    const certNo = await generateCertNo(issueNo || null);

    let parsedTempCycleData = null;
    let parsedDistortionBefore = null;
    let parsedDistortionAfter = null;
    let parsedCertHeatProcesses = null;
    let parsedItems = null;
    let parsedInspectionResults = null;
    let parsedSelectedChallanItemIds = null;

    try {
      parsedTempCycleData = parseJsonIfString(tempCycleData, { fieldName: 'tempCycleData', defaultValue: null });
      parsedDistortionBefore = parseJsonIfString(distortionBefore, { fieldName: 'distortionBefore', defaultValue: null });
      parsedDistortionAfter = parseJsonIfString(distortionAfter, { fieldName: 'distortionAfter', defaultValue: null });
      parsedCertHeatProcesses = parseJsonIfString(certHeatProcesses, { fieldName: 'certHeatProcesses', defaultValue: null });
      parsedItems = parseJsonIfString(items, { fieldName: 'items', defaultValue: null });
      parsedInspectionResults = parseJsonIfString(inspectionResults, { fieldName: 'inspectionResults', defaultValue: null });
      parsedSelectedChallanItemIds = parseJsonIfString(selectedChallanItemIds, { fieldName: 'selectedChallanItemIds', defaultValue: null });
    } catch (e) {
      if (e.code === 'INVALID_JSON') {
        return res.status(400).json({ success: false, code: e.code, message: e.message });
      }
      throw e;
    }

    // If specific challan items selected, fetch them to build cert items automatically
    let challanItemsForCert = [];
    if (parsedSelectedChallanItemIds?.length) {
      challanItemsForCert = await prisma.challanItem.findMany({
        where: { id: { in: parsedSelectedChallanItemIds.map(toInt) }, certStatus: 'PENDING_CERT' },
      });
    }

    const cert = await prisma.$transaction(async (tx) => {
    const created = await tx.testCertificate.create({
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
        catWelded:            b(catWelded),
        catRusty:             b(catRusty),
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
        visualBefore:         b(visualBefore),
        visualAfter:          b(visualAfter),
        mpiBefore:            b(mpiBefore),
        mpiAfter:             b(mpiAfter),
        mpiNil:               b(mpiNil),
        hardnessMin:      hardnessMin      ? toNum(hardnessMin, null)      : null,
        hardnessMax:      hardnessMax      ? toNum(hardnessMax, null)      : null,
        hardnessUnit:     hardnessUnit     || 'HRC',
        achievedHardness: achievedHardness || null,
        hardnessAfter1:   hardnessAfter1   || null,
        hardnessAfter2:   hardnessAfter2   || null,
        hardnessAfter3:   hardnessAfter3   || null,
        hardnessAfter4:   hardnessAfter4   || null,
        tempCycleData: parsedTempCycleData,
        tempCycleTemplateId: tempCycleTemplateId ? toInt(tempCycleTemplateId) : null,
        distortionBefore: parsedDistortionBefore,
        distortionAfter: parsedDistortionAfter,
        heatProcessData: parsedCertHeatProcesses,
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
        packedQty:            packedQty            ? toInt(packedQty) : null,
        packedBy:             packedBy             || null,
        approvedBy:           approvedBy           || null,
        finalInspectionBy:    finalInspectionBy    || null,
        remarks:              remarks              || null,
        createdById:    req.user.id,
        // Items: from selected challan items (preferred) or manually entered
        items: challanItemsForCert.length > 0 ? {
          create: challanItemsForCert.map(ci => ({
            description:  ci.description || ci.processName || '',
            quantity:     toInt(ci.quantity) || 1,
            weightPerPc:  null,
            totalWeight:  ci.weight ? toNum(ci.weight, null) : null,
            samplingPlan: null,
            remarks:      null,
            sourceChallanItemId: ci.id,
          })),
        } : parsedItems ? {
          create: parsedItems.map(it => ({
            description:  it.description,
            quantity:     toInt(it.quantity),
            weightPerPc:  it.weightPerPc  ? toNum(it.weightPerPc, null) : null,
            totalWeight:  it.totalWeight  ? toNum(it.totalWeight, null) : null,
            samplingPlan: it.samplingPlan || null,
            remarks:      it.remarks      || null,
            sourceChallanItemId: it.sourceChallanItemId ? toInt(it.sourceChallanItemId) : null,
          })),
        } : undefined,
        inspectionResults: parsedInspectionResults ? {
          create: parsedInspectionResults.map(ir => ({
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

    // Mark selected challan items as CERTIFIED
    if (challanItemsForCert.length > 0) {
      await tx.challanItem.updateMany({
        where: { id: { in: challanItemsForCert.map(ci => ci.id) } },
        data: { certStatus: 'CERTIFIED' },
      });
    }

    await syncCategorizationToJobCard(tx, created.jobCardId, req.body);

    return created;
    }); // end transaction

    res.status(201).json({ success: true, data: cert, message: `Certificate ${cert.certNo} created.` });
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

// ── Temperature Cycle Graphs (reusable master) ──────────────────
// Shared by Test Certificates and VHT Run Sheets. `data` holds ordered
// segments [{ tempC, holdMin, label }] — the same shape used by
// heatTreatmentCycles.js presets and VHTRunsheet.tempGraphPoints.
// At most one graph may be isDefault per processTypeId (NULL process
// is its own shared "general default" bucket). Certificates/run sheets
// copy the data on load — later edits to the master never touch what
// was already saved on an existing certificate or run sheet.

const tempCycleListSelect = {
  id: true, name: true, material: true, processTypeId: true, description: true,
  isDefault: true, isActive: true, createdAt: true, updatedAt: true,
  processType: { select: { id: true, name: true } },
};

exports.listTempCycleTemplates = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = (req.query.search || '').trim();
    const activeOnly = req.query.isActive === 'true';
    const where = {
      ...(activeOnly && { isActive: true }),
      ...(search && { name: { contains: search } }),
    };
    const [total, data] = await Promise.all([
      prisma.tempCycleTemplate.count({ where }),
      prisma.tempCycleTemplate.findMany({
        where,
        select: tempCycleListSelect,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        skip, take: limit,
      }),
    ]);
    res.json(formatListResponse(data, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getTempCycleTemplate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const template = await prisma.tempCycleTemplate.findUnique({
      where: { id },
      include: { processType: { select: { id: true, name: true } } },
    });
    if (!template) return res.status(404).json({ success: false, message: 'Graph not found.' });
    res.json({ success: true, data: template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// processTypeId: undefined = not provided (fall back to the shared bucket);
// null / '' also normalize to the shared (NULL-process) bucket.
exports.getDefaultTempCycleTemplate = async (req, res) => {
  try {
    const raw = req.query.processTypeId;
    const processTypeId = raw ? toInt(raw) : null;

    let template = null;
    if (processTypeId) {
      template = await prisma.tempCycleTemplate.findFirst({ where: { isDefault: true, processTypeId } });
    }
    if (!template) {
      template = await prisma.tempCycleTemplate.findFirst({ where: { isDefault: true, processTypeId: null } });
    }
    res.json({ success: true, data: template || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

function parseTempCycleBody(req) {
  const { name, material, processTypeId, description, data, isDefault, isActive } = req.body;
  const rows = data !== undefined ? parseJsonIfString(data, { fieldName: 'data', defaultValue: [] }) : undefined;
  return {
    name, material, description,
    processTypeId: processTypeId !== undefined ? (processTypeId ? toInt(processTypeId) : null) : undefined,
    rows,
    wantsDefault: isDefault === true || isDefault === 'true',
    defaultProvided: isDefault !== undefined,
    isActive: isActive !== undefined ? (isActive === true || isActive === 'true') : undefined,
  };
}

exports.createTempCycleTemplate = async (req, res) => {
  try {
    const { name, material, processTypeId, description, rows, wantsDefault } = parseTempCycleBody(req);
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ success: false, message: 'data must be a non-empty array of {tempC, holdMin, label} segments.' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'name is required.' });
    }

    const template = await prisma.$transaction(async (tx) => {
      if (wantsDefault) {
        await tx.tempCycleTemplate.updateMany({
          where: { isDefault: true, processTypeId: processTypeId ?? null },
          data: { isDefault: false },
        });
      }
      return tx.tempCycleTemplate.create({
        data: {
          name: name.trim(),
          material: material?.trim() || null,
          processTypeId: processTypeId ?? null,
          description: description?.trim() || null,
          data: rows,
          isDefault: wantsDefault,
          createdById: req.user.id,
        },
        include: { processType: { select: { id: true, name: true } } },
      });
    });

    res.status(201).json({ success: true, data: template, message: 'Graph saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save graph.' });
  }
};

exports.updateTempCycleTemplate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const existing = await prisma.tempCycleTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Graph not found.' });

    const { name, material, processTypeId, description, rows, wantsDefault, defaultProvided, isActive } = parseTempCycleBody(req);
    if (rows !== undefined && (!Array.isArray(rows) || !rows.length)) {
      return res.status(400).json({ success: false, message: 'data must be a non-empty array of {tempC, holdMin, label} segments.' });
    }

    const finalProcessTypeId = processTypeId !== undefined ? processTypeId : existing.processTypeId;

    const template = await prisma.$transaction(async (tx) => {
      if (defaultProvided && wantsDefault) {
        await tx.tempCycleTemplate.updateMany({
          where: { isDefault: true, processTypeId: finalProcessTypeId ?? null, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.tempCycleTemplate.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(material !== undefined && { material: material?.trim() || null }),
          ...(processTypeId !== undefined && { processTypeId }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(rows !== undefined && { data: rows }),
          ...(defaultProvided && { isDefault: wantsDefault }),
          ...(isActive !== undefined && { isActive }),
        },
        include: { processType: { select: { id: true, name: true } } },
      });
    });

    res.json({ success: true, data: template, message: 'Graph updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update graph.' });
  }
};

exports.duplicateTempCycleTemplate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const src = await prisma.tempCycleTemplate.findUnique({ where: { id } });
    if (!src) return res.status(404).json({ success: false, message: 'Graph not found.' });

    const copy = await prisma.tempCycleTemplate.create({
      data: {
        name: `${src.name} (Copy)`,
        material: src.material,
        processTypeId: src.processTypeId,
        description: src.description,
        data: src.data,
        isDefault: false,
        isActive: src.isActive,
        createdById: req.user.id,
      },
      include: { processType: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: copy, message: 'Graph duplicated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to duplicate graph.' });
  }
};

exports.setDefaultTempCycleTemplate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const existing = await prisma.tempCycleTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Graph not found.' });

    const template = await prisma.$transaction(async (tx) => {
      await tx.tempCycleTemplate.updateMany({
        where: { isDefault: true, processTypeId: existing.processTypeId, NOT: { id } },
        data: { isDefault: false },
      });
      return tx.tempCycleTemplate.update({
        where: { id },
        data: { isDefault: true },
        include: { processType: { select: { id: true, name: true } } },
      });
    });

    res.json({ success: true, data: template, message: 'Set as default.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to set default.' });
  }
};

exports.deleteTempCycleTemplate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    await prisma.tempCycleTemplate.delete({ where: { id } });
    res.json({ success: true, message: 'Graph deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete graph.' });
  }
};

exports.listCertificates = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const exportAll = String(req.query.exportAll) === 'true';
    const where = {};
    const status = req.query.status;
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    const search = req.query.search;

    log.debug('[CERT LIST]', { exportAll, page, limit, skip, status, fromDate, toDate });

    if (status && status !== 'all') {
      where.status = status;
    }
    const searchText = String(search || '').trim();
    if (searchText) {
      where.OR = [
        { certNo: { contains: searchText } },
        { customer: { name: { contains: searchText } } },
        { jobCard: { is: { jobCardNo: { contains: searchText } } } },
      ];
    }

    // Date filtering
    if (fromDate || toDate) {
      where.issueDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!Number.isNaN(from.getTime())) {
          where.issueDate.gte = from;
        }
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!Number.isNaN(to.getTime())) {
          // Add one day to include the end date
          to.setDate(to.getDate() + 1);
          where.issueDate.lt = to;
        }
      }
    }

    const queryConfig = {
      where,
      include: {
        jobCard:   { select: { id: true, jobCardNo: true } },
        customer:  { select: { name: true } },
        items:     true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(exportAll ? { skip: 0, take: 100000 } : { skip, take: limit }),
    };

    log.debug('[CERT QUERY]', { where: Object.keys(queryConfig.where || {}) });

    const [certs, total] = await Promise.all([
      prisma.testCertificate.findMany(queryConfig),
      prisma.testCertificate.count({ where }),
    ]);

    log.debug('[CERT RESULTS]', { certsReturned: certs.length, totalInDB: total, exportAll });
    
    res.json(formatListResponse(certs, total, exportAll ? 1 : page, exportAll ? certs.length : limit));
  } catch (err) {
    console.error('ListCertificates error:', err);
    res.status(getStatusCode('ERR_INTERNAL')).json(formatErrorResponse('ERR_INTERNAL', 'Server error.'));
  }
};

exports.updateCertificate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid certificate ID.' });

    const existing = await prisma.testCertificate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    const {
      yourPoNo, yourPoDate, yourRefNo, issueDate, checkedBy,
      customerId, issuedByPartyId,
      dieMaterial, operatorMode,
      specInstrCertificate, specInstrMpiReport, specInstrProcessGraph,
      deliveryDate, specialRequirements, precautions,
      catNormal, catWelded, catRusty, catCrackRisk, catDistortionRisk, catCriticalFinishing, catDentDamage, catCavity, catOthers,
      procStressRelieving, procHardening, procTempering, procAnnealing, procBrazing, procPlasmaNitriding, procSubZero, procSoakClean,
      visualBefore, visualAfter, mpiBefore, mpiAfter, mpiNil,
      hardnessMin, hardnessMax, hardnessUnit, achievedHardness,
      hardnessAfter1, hardnessAfter2, hardnessAfter3, hardnessAfter4,
      tempCycleData, tempCycleTemplateId, distortionBefore, distortionAfter,
      packedQty, packedBy, approvedBy, finalInspectionBy,
      issuedTo, heatNo, dispatchChallanNo, dispatchChallanDate, dispatchedThrough,
      remarks,
      items, inspectionResults, certHeatProcesses, status,
    } = req.body;
    const b = (v) => v === 'true' || v === true;
    const images = getImagePaths(req.files);

    // Photos could only ever be ADDED: an upload set the column, and anything
    // else left it untouched. So removing a photo in the form changed nothing —
    // it stayed in the database and kept printing. The form now names the slots
    // it cleared, and those columns are set to null.
    const removeSlots = new Set(
      String(req.body.removeImages || '')
        .split(',')
        .map(v => parseInt(v, 10))
        .filter(n => n >= 1 && n <= 5)
    );
    const clearedImages = {};
    if (removeSlots.size) {
      const before = await prisma.testCertificate.findUnique({
        where: { id },
        select: { image1: true, image2: true, image3: true, image4: true, image5: true },
      });
      for (const n of removeSlots) {
        const key = `image${n}`;
        // A slot that is being replaced in the same save keeps the new upload.
        if (images[key]) continue;
        clearedImages[key] = null;
        deleteCertImage(before?.[key]);
      }
    }

    let parsedTempCycleData, parsedDistortionBefore, parsedDistortionAfter,
        parsedCertHeatProcesses, parsedItems, parsedInspectionResults;
    try {
      parsedTempCycleData      = parseJsonIfString(tempCycleData,      { fieldName: 'tempCycleData',      defaultValue: null });
      parsedDistortionBefore   = parseJsonIfString(distortionBefore,   { fieldName: 'distortionBefore',   defaultValue: null });
      parsedDistortionAfter    = parseJsonIfString(distortionAfter,    { fieldName: 'distortionAfter',    defaultValue: null });
      parsedCertHeatProcesses  = parseJsonIfString(certHeatProcesses,  { fieldName: 'certHeatProcesses',  defaultValue: null });
      parsedItems              = parseJsonIfString(items,              { fieldName: 'items',              defaultValue: null });
      parsedInspectionResults  = parseJsonIfString(inspectionResults,  { fieldName: 'inspectionResults',  defaultValue: null });
    } catch (e) {
      if (e.code === 'INVALID_JSON') return res.status(400).json({ success: false, code: e.code, message: e.message });
      throw e;
    }

    // Items are deleted and re-created on every save, which gives them new ids
    // and would null every rework/reject entry raised against them. Remember
    // which old item each entry pointed at so it can be re-attached below.
    let reworkRelinks = [];
    if (parsedItems !== null) {
      const oldItems = await prisma.certItem.findMany({ where: { certId: id }, orderBy: { id: 'asc' }, select: { id: true, description: true } });
      if (oldItems.length) {
        const links = await prisma.reworkEntry.findMany({
          where: { certItemId: { in: oldItems.map((o) => o.id) } },
          select: { id: true, certItemId: true },
        });
        reworkRelinks = links.map((l) => {
          const idx = oldItems.findIndex((o) => o.id === l.certItemId);
          return { entryId: l.id, oldIndex: idx, description: oldItems[idx]?.description };
        });
      }
      await prisma.certItem.deleteMany({ where: { certId: id } });
    }
    if (parsedInspectionResults !== null) await prisma.certInspectionResult.deleteMany({ where: { certId: id } });

    const cert = await prisma.testCertificate.update({
      where: { id },
      data: {
        yourPoNo:             yourPoNo             || null,
        yourPoDate:           yourPoDate           ? new Date(yourPoDate) : null,
        yourRefNo:            yourRefNo            || null,
        issueDate:            issueDate            ? new Date(issueDate) : undefined,
        checkedBy:            checkedBy            || null,
        customerId:           customerId           ? toInt(customerId) : undefined,
        issuedByPartyId:      issuedByPartyId      ? toInt(issuedByPartyId) : null,
        dieMaterial:          dieMaterial          || null,
        operatorMode:         operatorMode         || null,
        specInstrCertificate:  b(specInstrCertificate),
        specInstrMpiReport:    b(specInstrMpiReport),
        specInstrProcessGraph: b(specInstrProcessGraph),
        deliveryDate:         deliveryDate         ? new Date(deliveryDate) : null,
        specialRequirements:  specialRequirements  || null,
        precautions:          precautions          || null,
        catNormal:            b(catNormal),
        catWelded:            b(catWelded),
        catRusty:             b(catRusty),
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
        visualBefore:         b(visualBefore),
        visualAfter:          b(visualAfter),
        mpiBefore:            b(mpiBefore),
        mpiAfter:             b(mpiAfter),
        mpiNil:               b(mpiNil),
        hardnessMin:          hardnessMin          ? toNum(hardnessMin, null)      : null,
        hardnessMax:          hardnessMax          ? toNum(hardnessMax, null)      : null,
        hardnessUnit:         hardnessUnit         || 'HRC',
        achievedHardness:     achievedHardness     || null,
        hardnessAfter1:       hardnessAfter1       || null,
        hardnessAfter2:       hardnessAfter2       || null,
        hardnessAfter3:       hardnessAfter3       || null,
        hardnessAfter4:       hardnessAfter4       || null,
        tempCycleData:        parsedTempCycleData,
        tempCycleTemplateId:  tempCycleTemplateId ? toInt(tempCycleTemplateId) : null,
        distortionBefore:     parsedDistortionBefore,
        distortionAfter:      parsedDistortionAfter,
        heatProcessData:      parsedCertHeatProcesses,
        ...(images.image1 && { image1: images.image1 }),
        ...(images.image2 && { image2: images.image2 }),
        ...(images.image3 && { image3: images.image3 }),
        ...(images.image4 && { image4: images.image4 }),
        ...(images.image5 && { image5: images.image5 }),
        ...clearedImages,
        issuedTo:             issuedTo             || null,
        heatNo:               heatNo               || null,
        dispatchChallanNo:    dispatchChallanNo    || null,
        dispatchChallanDate:  dispatchChallanDate  ? new Date(dispatchChallanDate) : null,
        dispatchedThrough:    dispatchedThrough    || null,
        packedQty:            packedQty            ? toInt(packedQty) : null,
        packedBy:             packedBy             || null,
        approvedBy:           approvedBy           || null,
        finalInspectionBy:    finalInspectionBy    || null,
        remarks:              remarks              || null,
        ...(status ? { status } : {}),
        ...(parsedItems !== null ? {
          items: { create: parsedItems.map(it => ({
            description: it.description,
            quantity:    toInt(it.quantity),
            weightPerPc: it.weightPerPc ? toNum(it.weightPerPc, null) : null,
            totalWeight: it.totalWeight ? toNum(it.totalWeight, null) : null,
            samplingPlan: it.samplingPlan || null,
            remarks:      it.remarks     || null,
            sourceChallanItemId: it.sourceChallanItemId ? toInt(it.sourceChallanItemId) : null,
          })) },
        } : {}),
        ...(parsedInspectionResults !== null ? {
          inspectionResults: { create: parsedInspectionResults.map(ir => ({
            inspectionType:  ir.inspectionType,
            parameter:       ir.parameter       || null,
            requiredValue:   ir.requiredValue   || null,
            achievedValue:   ir.achievedValue   || null,
            result:          ir.result          || 'OK',
            finalInspection: ir.finalInspection || null,
          })) },
        } : {}),
      },
      include: { items: true, inspectionResults: true, customer: true },
    });

    // Re-attach rework/reject entries: same position with the same description,
    // else the first new item with that description; otherwise leave unlinked
    // (the entry keeps its own description/qty snapshot either way).
    if (reworkRelinks.length) {
      const newItems = [...(cert.items || [])].sort((a, b) => a.id - b.id);
      for (const l of reworkRelinks) {
        const target = (newItems[l.oldIndex]?.description === l.description ? newItems[l.oldIndex] : null)
          || newItems.find((n) => n.description === l.description);
        if (target) await prisma.reworkEntry.update({ where: { id: l.entryId }, data: { certItemId: target.id } });
      }
    }

    await syncCategorizationToJobCard(prisma, existing.jobCardId, req.body);

    res.json({ success: true, data: cert, message: 'Certificate updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteCertificate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid certificate ID.' });

    // Before deleting, find linked challan items and reset their certStatus
    const linkedCertItems = await prisma.certItem.findMany({
      where: { certId: id, sourceChallanItemId: { not: null } },
      select: { sourceChallanItemId: true },
    });
    const challanItemIds = linkedCertItems.map(ci => ci.sourceChallanItemId).filter(Boolean);

    await prisma.$transaction(async (tx) => {
      if (challanItemIds.length > 0) {
        await tx.challanItem.updateMany({
          where: { id: { in: challanItemIds } },
          data: { certStatus: 'PENDING_CERT' },
        });
      }
      await tx.testCertificate.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Certificate deleted.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Certificate not found.' });
    if (err.code === 'P2003') return res.status(400).json({ success: false, message: 'Cannot delete: certificate has linked records.' });
    res.status(500).json({ success: false, message: err.message });
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
            challans: { include: { items: true }, orderBy: { createdAt: 'asc' } },
            challanItemLinks: {
              include: { challan: { select: { id: true, challanNo: true, inwardNo: true, challanDate: true } } },
              orderBy: { id: 'asc' },
              take: 1,
            },
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

// ── Rework Data register (QF-QA-07) ─────────────────────────────
// A failed cert (hardness below spec) is logged here per month; linked to
// the original certificate and, once redone, to the passing result cert.
const reworkInclude = {
  jobCard: { select: { id: true, jobCardNo: true } },
  certificate: { select: { id: true, certNo: true } },
  certItem: { select: { id: true, description: true, quantity: true } },
  reworkCertificate: { select: { id: true, certNo: true } },
  ncEntries: { select: { id: true, srNo: true } },
};

exports.getReworkMonth = async (req, res) => {
  try {
    const year = toInt(req.query.year);
    const month = toInt(req.query.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year and month (1-12) are required.' });
    }

    const monthRow = await prisma.reworkMonth.findUnique({
      where: { year_month: { year, month } },
      include: { entries: { include: reworkInclude, orderBy: { srNo: 'asc' } } },
    });

    const entries = monthRow?.entries || [];
    const totalReworkQty = entries.reduce((s, e) => s + (e.qty || 0), 0);
    const totalReworkWeight = entries.reduce((s, e) => s + toNum(e.weightKg, 0), 0);
    const totalProcessedWeightKg = toNum(monthRow?.totalProcessedWeightKg, 0);
    const monthlyReworkPercent = totalProcessedWeightKg > 0 ? (totalReworkWeight / totalProcessedWeightKg) * 100 : 0;

    res.json({
      success: true,
      data: {
        year,
        month,
        id: monthRow?.id || null,
        totalProcessedWeightKg: monthRow?.totalProcessedWeightKg ?? null,
        targetPercent: monthRow ? toNum(monthRow.targetPercent, 1) : 1,
        causes: monthRow?.causes || [],
        correctiveActions: monthRow?.correctiveActions || [],
        entries,
        totals: {
          totalReworkQty,
          totalReworkWeight: toNum(totalReworkWeight.toFixed(3), 0),
          monthlyReworkPercent: toNum(monthlyReworkPercent.toFixed(3), 0),
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertReworkMonth = async (req, res) => {
  try {
    const year = toInt(req.body.year);
    const month = toInt(req.body.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'year and month (1-12) are required.' });
    }
    const { totalProcessedWeightKg, targetPercent, causes, correctiveActions } = req.body;

    const payload = {
      totalProcessedWeightKg: totalProcessedWeightKg != null && totalProcessedWeightKg !== '' ? toNum(totalProcessedWeightKg, null) : null,
      targetPercent: targetPercent != null && targetPercent !== '' ? toNum(targetPercent, 1) : 1,
      causes: Array.isArray(causes) ? causes.slice(0, 20).map((c) => String(c).slice(0, 1000)) : [],
      correctiveActions: Array.isArray(correctiveActions) ? correctiveActions.slice(0, 20).map((c) => String(c).slice(0, 1000)) : [],
    };

    const saved = await prisma.reworkMonth.upsert({
      where: { year_month: { year, month } },
      update: payload,
      create: { year, month, ...payload, createdById: req.user.id },
    });

    res.json({ success: true, data: saved, message: 'Rework month saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertReworkEntry = async (req, res) => {
  try {
    const { id, year, month, entryDate, type, jobCardId, certificateId, certItemId, reworkCertificateId,
      customerName, description, qty, weightKg, jobCardNoText, hardnessRequired,
      cycleNo, reason, reworkCycleNo, afterProcessResults, remark } = req.body;
    const y = toInt(year);
    const m = toInt(month);
    if (!y || !m || m < 1 || m > 12 || !entryDate) {
      return res.status(400).json({ success: false, message: 'year, month and entryDate are required.' });
    }
    const entryDt = parseYMD(entryDate);
    if (!entryDt) return res.status(400).json({ success: false, message: 'entryDate must be a valid YYYY-MM-DD.' });
    const qtyNum = finiteOrNull(qty);
    const wtNum = finiteOrNull(weightKg);
    if ((qtyNum != null && (qtyNum < 0 || qtyNum > 1e6)) || (wtNum != null && (wtNum < 0 || wtNum >= 1e7))) {
      return res.status(400).json({ success: false, message: 'qty / weight is out of range.' });
    }

    const payload = {
      entryDate: entryDt,
      type: type === 'REJECT' ? 'REJECT' : 'REWORK',
      jobCardId: jobCardId ? toInt(jobCardId) : null,
      certificateId: certificateId ? toInt(certificateId) : null,
      certItemId: certItemId ? toInt(certItemId) : null,
      reworkCertificateId: reworkCertificateId ? toInt(reworkCertificateId) : null,
      customerName: clip(customerName, 200),
      description: clip(description, 300),
      qty: qtyNum != null ? Math.round(qtyNum) : null,
      weightKg: wtNum,
      jobCardNoText: clip(jobCardNoText, 50),
      hardnessRequired: clip(hardnessRequired, 50),
      cycleNo: clip(cycleNo, 50),
      reason: clip(reason, 5000),
      reworkCycleNo: clip(reworkCycleNo, 50),
      afterProcessResults: clip(afterProcessResults, 100),
      remark: clip(remark, 200),
    };

    // Rework + reject raised against one certificate item can never add up to
    // more than that item's quantity.
    if (payload.certItemId && payload.qty) {
      const item = await prisma.certItem.findUnique({ where: { id: payload.certItemId }, select: { quantity: true, description: true } });
      if (item) {
        const others = await prisma.reworkEntry.aggregate({
          where: { certItemId: payload.certItemId, ...(id ? { id: { not: toInt(id) } } : {}) },
          _sum: { qty: true },
        });
        const already = others._sum.qty || 0;
        if (already + payload.qty > item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${Math.max(0, item.quantity - already)} of ${item.quantity} pcs of "${item.description}" are left to raise (${already} already raised).`,
          });
        }
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const monthRow = await tx.reworkMonth.upsert({
        where: { year_month: { year: y, month: m } },
        update: {},
        create: { year: y, month: m, createdById: req.user.id },
      });

      if (id) {
        return tx.reworkEntry.update({ where: { id: toInt(id) }, data: payload, include: reworkInclude });
      }

      const lastEntry = await tx.reworkEntry.findFirst({
        where: { monthId: monthRow.id },
        orderBy: { srNo: 'desc' },
        select: { srNo: true },
      });
      const srNo = (lastEntry?.srNo || 0) + 1;

      return tx.reworkEntry.create({
        data: { ...payload, monthId: monthRow.id, srNo, createdById: req.user.id },
        include: reworkInclude,
      });
    });

    res.json({ success: true, data: saved, message: 'Rework entry saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteReworkEntry = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.reworkEntry.delete({ where: { id } });
    res.json({ success: true, message: 'Rework entry deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Inhouse NC Register (QF-QA-20) ──────────────────────────────
// A single continuous register (not month-scoped, matches the paper form's
// own "1 OF 1" single running page) — usually one row per Rework Data entry.
exports.listNcRegister = async (req, res) => {
  try {
    const rows = await prisma.ncRegisterEntry.findMany({
      include: {
        reworkEntry: { select: { id: true, srNo: true, monthId: true } },
        certificate: { select: { id: true, certNo: true } },
      },
      orderBy: { srNo: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.upsertNcRegisterEntry = async (req, res) => {
  try {
    const { id, entryDate, reworkEntryId, certificateId, customerName, testReport,
      process: processName, stage, ncQty, ncDetails, disposition, rootCauseAnalysis,
      correctiveAction, reVerification, sign } = req.body;
    if (!entryDate) return res.status(400).json({ success: false, message: 'entryDate is required.' });
    const ncDate = parseYMD(entryDate);
    if (!ncDate) return res.status(400).json({ success: false, message: 'entryDate must be a valid YYYY-MM-DD.' });

    const payload = {
      entryDate: ncDate,
      reworkEntryId: reworkEntryId ? toInt(reworkEntryId) : null,
      certificateId: certificateId ? toInt(certificateId) : null,
      customerName: clip(customerName, 200),
      testReport: clip(testReport, 100),
      process: clip(processName, 200),
      stage: clip(stage, 200),
      ncQty: clip(ncQty, 20),
      ncDetails: clip(ncDetails, 5000),
      disposition: clip(disposition, 5000),
      rootCauseAnalysis: clip(rootCauseAnalysis, 5000),
      correctiveAction: clip(correctiveAction, 5000),
      reVerification: clip(reVerification, 200),
      sign: clip(sign, 100),
    };

    let saved;
    if (id) {
      saved = await prisma.ncRegisterEntry.update({ where: { id: toInt(id) }, data: payload });
    } else {
      const last = await prisma.ncRegisterEntry.findFirst({ orderBy: { srNo: 'desc' }, select: { srNo: true } });
      saved = await prisma.ncRegisterEntry.create({ data: { ...payload, srNo: (last?.srNo || 0) + 1, createdById: req.user.id } });
    }

    res.json({ success: true, data: saved, message: 'NC register entry saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteNcRegisterEntry = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.ncRegisterEntry.delete({ where: { id } });
    res.json({ success: true, message: 'NC register entry deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
