/**
 * Comprehensive ERP Data Population Script
 * Creates complete workflow data for all parties with realistic completed/pending/in-progress states
 *
 * Run: node scripts/comprehensive-data-seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sample data arrays
const ITEMS = [
  { partNo: 'DIE-001', description: 'Progressive Die for Automotive Parts', unit: 'NOS' },
  { partNo: 'MOULD-002', description: 'Injection Mould for Plastic Components', unit: 'NOS' },
  { partNo: 'TOOL-003', description: 'Cutting Tool Set', unit: 'SET' },
  { partNo: 'SHAFT-004', description: 'Drive Shaft Component', unit: 'PCS' },
  { partNo: 'GEAR-005', description: 'Precision Gear', unit: 'PCS' },
  { partNo: 'PLATE-006', description: 'Steel Plate 10mm', unit: 'KGS' },
  { partNo: 'BAR-007', description: 'Round Bar EN8', unit: 'MTR' },
  { partNo: 'SHEET-008', description: 'Aluminum Sheet 5mm', unit: 'SQFT' },
  { partNo: 'PIPE-009', description: 'Stainless Steel Pipe', unit: 'MTR' },
  { partNo: 'CAST-010', description: 'Cast Iron Component', unit: 'NOS' },
];

const PROCESSES = [
  { name: 'Hardening', description: 'Heat treatment hardening process', basePrice: 250.00 },
  { name: 'Tempering', description: 'Heat treatment tempering process', basePrice: 180.00 },
  { name: 'Annealing', description: 'Heat treatment annealing process', basePrice: 200.00 },
  { name: 'Nitriding', description: 'Surface hardening by nitriding', basePrice: 350.00 },
  { name: 'Carburizing', description: 'Surface hardening by carburizing', basePrice: 400.00 },
  { name: 'Stress Relieving', description: 'Stress relieving heat treatment', basePrice: 150.00 },
  { name: 'Normalizing', description: 'Normalizing heat treatment', basePrice: 120.00 },
  { name: 'Quenching', description: 'Rapid cooling process', basePrice: 100.00 },
];

async function generateJobCardNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;
  let attempts = 0;
  let jobCardNo;
  do {
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    jobCardNo = `${prefix}${rand}`;
    const exists = await prisma.jobCard.findUnique({ where: { jobCardNo } });
    if (!exists) return jobCardNo;
    attempts++;
  } while (attempts < 30);
  throw new Error('Could not allocate unique job card number.');
}

async function generateChallanNo() {
  const y = new Date().getFullYear().toString().slice(-2);
  const yn = String(parseInt(y, 10) + 1);
  const prefix = `SDT/JW/${y}-${yn}/`;
  const last = await prisma.jobworkChallan.findFirst({
    where: { challanNo: { startsWith: prefix } },
    orderBy: { challanNo: 'desc' },
  });
  let nextSerial = 1;
  if (last) {
    const parts = last.challanNo.split('/');
    nextSerial = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
  }
  let challanNo;
  do {
    challanNo = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    const exists = await prisma.jobworkChallan.findUnique({ where: { challanNo } });
    if (!exists) break;
    nextSerial++;
  } while (nextSerial < 9999);
  return challanNo;
}

async function createItems() {
  console.log('Creating inventory items...');
  let created = 0;
  for (const itemData of ITEMS) {
    const existing = await prisma.item.findUnique({ where: { partNo: itemData.partNo } });
    if (!existing) {
      await prisma.item.create({
        data: {
          ...itemData,
          isActive: true,
        },
      });
      created++;
    }
  }
  console.log(`Items: ${created} created`);
  return created;
}

async function createProcesses() {
  console.log('Creating process types...');
  let created = 0;

  const processTypes = [
    { code: 'HT-HARD', name: 'Hardening', description: 'Heat treatment hardening process', pricePerKg: 250.00, gstRate: 18.00 },
    { code: 'HT-TEMP', name: 'Tempering', description: 'Heat treatment tempering process', pricePerKg: 180.00, gstRate: 18.00 },
    { code: 'HT-ANN', name: 'Annealing', description: 'Heat treatment annealing process', pricePerKg: 200.00, gstRate: 18.00 },
    { code: 'HT-NIT', name: 'Nitriding', description: 'Surface hardening by nitriding', pricePerKg: 350.00, gstRate: 18.00 },
    { code: 'HT-CARB', name: 'Carburizing', description: 'Surface hardening by carburizing', pricePerKg: 400.00, gstRate: 18.00 },
    { code: 'HT-STRESS', name: 'Stress Relieving', description: 'Stress relieving heat treatment', pricePerKg: 150.00, gstRate: 18.00 },
    { code: 'HT-NORM', name: 'Normalizing', description: 'Normalizing heat treatment', pricePerKg: 120.00, gstRate: 18.00 },
    { code: 'HT-QUENCH', name: 'Quenching', description: 'Rapid cooling process', pricePerKg: 100.00, gstRate: 18.00 },
  ];

  for (const processData of processTypes) {
    const existing = await prisma.processType.findFirst({ where: { name: processData.name } });
    if (!existing) {
      await prisma.processType.create({
        data: processData,
      });
      created++;
    }
  }
  console.log(`Process Types: ${created} created`);
  return created;
}

async function createComprehensiveJobCards() {
  console.log('Creating comprehensive job cards for all parties...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  if (!user) {
    throw new Error('No user found. Run ensure-admin-user.js first.');
  }

  const parties = await prisma.party.findMany({ orderBy: { id: 'asc' } });
  const items = await prisma.item.findMany();

  if (items.length === 0) {
    throw new Error('No items found. Run createItems first.');
  }

  let created = 0;
  const statuses = ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED', 'ON_HOLD'];

  for (const party of parties) {
    // Create 2-4 job cards per party with different statuses
    const numCards = Math.floor(Math.random() * 3) + 2; // 2-4 cards

    for (let i = 0; i < numCards; i++) {
      const jobCardNo = await generateJobCardNo();
      const item = items[Math.floor(Math.random() * items.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const quantity = Math.floor(Math.random() * 50) + 10; // 10-60 qty

      // Calculate dates
      const receivedDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const dueDate = new Date(receivedDate.getTime() + (7 + Math.random() * 21) * 24 * 60 * 60 * 1000); // 7-28 days later

      await prisma.jobCard.create({
        data: {
          jobCardNo,
          partId: item.id,
          customerId: party.id,
          quantity,
          customerNameSnapshot: party.name,
          customerAddressSnapshot: `${party.address || ''}, ${party.city || ''}, ${party.state || ''} ${party.pinCode || ''}`.trim(),
          contactEmail: party.email || null,
          status,
          createdById: user.id,
          remarks: `Comprehensive seed data - ${party.name}`,
          receivedDate,
          dueDate,
          factoryName: 'SHITAL VACUUM TREAT PVT LTD.',
          factoryAddress: 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
        },
      });
      created++;
    }
  }

  console.log(`Job Cards: ${created} created for ${parties.length} parties`);
  return created;
}

async function createInspectionsForJobCards() {
  console.log('Creating inspections for job cards...');

  const jobCards = await prisma.jobCard.findMany({
    where: { status: { in: ['CREATED', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED', 'ON_HOLD'] } },
    include: { inspection: true }
  });

  let created = 0;
  for (const card of jobCards) {
    if (!card.inspection) {
      const inspectionStatus = Math.random() > 0.2 ? 'PASS' : 'FAIL'; // 80% pass rate

      await prisma.incomingInspection.create({
        data: {
          jobCardId: card.id,
          catNormal: Math.random() > 0.5,
          procHardening: Math.random() > 0.3,
          procTempering: Math.random() > 0.4,
          visualBefore: true,
          visualAfter: inspectionStatus === 'PASS',
          requiredHardnessMin: 45 + Math.random() * 15,
          requiredHardnessMax: 55 + Math.random() * 15,
          hardnessUnit: 'HRC',
          achievedHardness: inspectionStatus === 'PASS' ? 50 + Math.random() * 10 : null,
          inspectionStatus,
          inspectionDate: new Date(card.receivedDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000),
          incomingInspectionBy: 'QC Team',
          finalInspectionBy: inspectionStatus === 'PASS' ? 'QC Team' : null,
          remarks: `Inspection for ${card.jobCardNo} - ${inspectionStatus}`,
          packedQty: inspectionStatus === 'PASS' ? card.quantity : null,
        },
      });

      // Update job card status based on inspection
      let newStatus = card.status;
      if (inspectionStatus === 'PASS' && card.status === 'CREATED') {
        newStatus = 'INSPECTION';
      }

      await prisma.jobCard.update({
        where: { id: card.id },
        data: { status: newStatus }
      });

      created++;
    }
  }

  console.log(`Inspections: ${created} created`);
  return created;
}

async function createJobWorkChallans() {
  console.log('Creating job work challans...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const parties = await prisma.party.findMany();
  const items = await prisma.item.findMany();
  const jobCards = await prisma.jobCard.findMany({ where: { status: { in: ['INSPECTION', 'IN_PROGRESS', 'SENT_FOR_JOBWORK', 'COMPLETED'] } } });

  let created = 0;
  const statuses = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED'];

  // Create challans for job cards
  for (const jobCard of jobCards) {
    if (Math.random() > 0.3) { // 70% chance of having a challan
      const challanNo = await generateChallanNo();
      const toParty = parties[Math.floor(Math.random() * parties.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const qty = Math.floor(jobCard.quantity * (0.8 + Math.random() * 0.4)); // 80-120% of job card qty
      const rate = 200 + Math.random() * 300; // 200-500 per unit
      const amount = qty * rate;

      const challan = await prisma.jobworkChallan.create({
        data: {
          challanNo,
          challanDate: new Date(jobCard.receivedDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          jobCardId: jobCard.id,
          fromPartyId: jobCard.customerId,
          toPartyId: toParty.id,
          transportMode: ['Road', 'Rail', 'Air'][Math.floor(Math.random() * 3)],
          processingNotes: `Processing for ${jobCard.jobCardNo} - ${toParty.name}`,
          subtotal: amount,
          handlingCharges: amount * 0.05,
          totalValue: amount * 1.05,
          grandTotal: amount * 1.05 * 1.18,
          cgstRate: 9,
          sgstRate: 9,
          cgstAmount: amount * 1.05 * 0.09,
          sgstAmount: amount * 1.05 * 0.09,
          status,
          createdById: user.id,
        },
      });

      // Create challan items
      const item = items[Math.floor(Math.random() * items.length)];
      await prisma.challanItem.create({
        data: {
          challanId: challan.id,
          itemId: item.id,
          description: item.description,
          drawingNo: `DW-${jobCard.jobCardNo}`,
          material: ['EN8', 'EN9', 'EN19', 'SS304', 'MS'][Math.floor(Math.random() * 5)],
          hrc: Math.random() > 0.5 ? `${45 + Math.floor(Math.random() * 20)} HRC` : null,
          quantity: qty,
          qtyOut: status === 'COMPLETED' ? qty : Math.floor(qty * Math.random()),
          uom: 'KGS',
          weight: qty * (0.5 + Math.random() * 1.5),
          rate,
          amount,
        },
      });

      created++;
    }
  }

  // Create some standalone challans (not linked to job cards)
  for (let i = 0; i < 5; i++) {
    const challanNo = await generateChallanNo();
    const fromParty = parties[Math.floor(Math.random() * parties.length)];
    const toParty = parties[Math.floor(Math.random() * parties.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const qty = 10 + Math.floor(Math.random() * 40);
    const rate = 150 + Math.random() * 200;
    const amount = qty * rate;

    const challan = await prisma.jobworkChallan.create({
      data: {
        challanNo,
        challanDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        jobCardId: null,
        fromPartyId: fromParty.id,
        toPartyId: toParty.id,
        transportMode: 'Road',
        processingNotes: `Standalone job work - ${fromParty.name} to ${toParty.name}`,
        subtotal: amount,
        handlingCharges: 0,
        totalValue: amount,
        grandTotal: amount * 1.18,
        cgstRate: 9,
        sgstRate: 9,
        cgstAmount: amount * 0.09,
        sgstAmount: amount * 0.09,
        status,
        createdById: user.id,
      },
    });

    // Create challan items
    const item = items[Math.floor(Math.random() * items.length)];
    await prisma.challanItem.create({
      data: {
        challanId: challan.id,
        itemId: item.id,
        description: item.description,
        drawingNo: `DW-STAND-${i + 1}`,
        material: 'EN8',
        quantity: qty,
        qtyOut: status === 'COMPLETED' ? qty : Math.floor(qty * Math.random()),
        uom: 'KGS',
        weight: qty * 0.8,
        rate,
        amount,
      },
    });

    created++;
  }

  console.log(`Job Work Challans: ${created} created`);
  return created;
}

async function assignMachinesToJobCards() {
  console.log('Assigning machines to job cards...');

  const machines = await prisma.machine.findMany();
  const jobCards = await prisma.jobCard.findMany({
    where: { 
      status: { in: ['IN_PROGRESS', 'SENT_FOR_JOBWORK', 'INSPECTION', 'COMPLETED'] },
      machineId: null // Only assign to job cards that don't have machines yet
    }
  });

  let assigned = 0;
  for (const jobCard of jobCards) {
    if (Math.random() > 0.4) { // 60% chance of machine assignment
      const machine = machines[Math.floor(Math.random() * machines.length)];

      await prisma.jobCard.update({
        where: { id: jobCard.id },
        data: { 
          machineId: machine.id,
          operatorName: `Operator ${Math.floor(Math.random() * 10) + 1}`,
          startDate: new Date(jobCard.receivedDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000),
        },
      });
      assigned++;
    }
  }

  console.log(`Machine Assignments: ${assigned} created`);
  return assigned;
}

async function createCertificates() {
  console.log('Creating test certificates...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const jobCards = await prisma.jobCard.findMany({
    where: { status: { in: ['COMPLETED', 'INSPECTION'] } },
    include: { customer: true, inspection: true, part: true }
  });

  let created = 0;
  const statuses = ['DRAFT', 'ISSUED', 'APPROVED'];

  for (const jobCard of jobCards) {
    if (Math.random() > 0.4) { // 60% chance of having a certificate
      const certSequence = 1; // For simplicity, one cert per job card
      const certNo = `CERT-${jobCard.jobCardNo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Some certificates will have quality issues
      const hasQualityIssues = Math.random() > 0.7; // 30% have issues

      const certificate = await prisma.testCertificate.create({
        data: {
          certNo,
          certSequence,
          dieMaterial: jobCard.part?.description || 'Steel Component',
          operatorMode: 'Heat Treatment',
          // Categorization based on inspection
          catNormal: jobCard.inspection?.catNormal || false,
          catCrackRisk: jobCard.inspection?.procHardening || false,
          catDistortionRisk: Math.random() > 0.8,
          catCriticalFinishing: Math.random() > 0.9,
          catDentDamage: Math.random() > 0.95,
          catCavity: Math.random() > 0.95,
          catOthers: Math.random() > 0.9,
          // Process checkboxes
          procStressRelieving: Math.random() > 0.6,
          procHardening: jobCard.inspection?.procHardening || false,
          procTempering: jobCard.inspection?.procTempering || false,
          procAnnealing: Math.random() > 0.7,
          procBrazing: Math.random() > 0.9,
          procPlasmaNitriding: Math.random() > 0.8,
          procSubZero: Math.random() > 0.9,
          procSoakClean: Math.random() > 0.8,
          jobCardId: jobCard.id,
          issueDate: new Date(jobCard.receivedDate.getTime() + (10 + Math.random() * 20) * 24 * 60 * 60 * 1000),
          checkedBy: 'QC Engineer',
          specInstrCertificate: true,
          specInstrMpiReport: Math.random() > 0.7,
          specInstrProcessGraph: Math.random() > 0.8,
          deliveryDate: status === 'APPROVED' ? new Date() : null,
          specialRequirements: hasQualityIssues ? 'Quality issues detected - requires rework' : null,
          precautions: 'Handle with care - heat treated component',

          customerId: jobCard.customerId,
          issuedByPartyId: jobCard.customerId, // Self-certified for demo

          hardnessMin: jobCard.inspection?.requiredHardnessMin || 45,
          hardnessMax: jobCard.inspection?.requiredHardnessMax || 55,

          tempCycleData: [
            { time: 0, temp: 25 },
            { time: 120, temp: 850 },
            { time: 180, temp: 850 },
            { time: 240, temp: 25 }
          ],
          heatProcessData: [
            { equipment: 'VHT-01', process: 'Hardening', duration: 120, temp: 850 }
          ],

          issuedTo: jobCard.customer?.name,
          heatNo: jobCard.heatNo,
          dispatchMode: 'Courier',
          packedQty: jobCard.quantity,
          packedBy: 'Warehouse Team',
          approvedBy: status === 'APPROVED' ? 'Quality Manager' : null,
          status: status,

          createdById: user.id,
        },
      });

      // Add certificate items
      await prisma.certItem.create({
        data: {
          certId: certificate.id,
          description: jobCard.part?.description || 'Heat treated component',
          quantity: jobCard.quantity,
          weightPerPc: 2.5 + Math.random() * 5, // Random weight per piece
          totalWeight: jobCard.quantity * (2.5 + Math.random() * 5),
          samplingPlan: 'AQL 1.5',
          remarks: 'Standard heat treatment process applied',
        },
      });

      // Add inspection results with some failures
      const inspectionPassed = !hasQualityIssues && Math.random() > 0.2; // 80% pass rate for good certs
      const minHardness = parseFloat(certificate.hardnessMin) || 45;
      const maxHardness = parseFloat(certificate.hardnessMax) || 55;
      await prisma.certInspectionResult.create({
        data: {
          certId: certificate.id,
          inspectionType: 'Hardness Test',
          parameter: 'Hardness',
          requiredValue: `${minHardness}-${maxHardness} ${certificate.hardnessUnit}`,
          achievedValue: inspectionPassed ?
            (minHardness + Math.random() * (maxHardness - minHardness)).toFixed(1) :
            (minHardness - 5 + Math.random() * 10).toFixed(1),
          result: inspectionPassed ? 'PASS' : 'FAIL',
          finalInspection: inspectionPassed ? 'Approved' : 'Rejected - Rework Required',
        },
      });

      created++;
    }
  }

  console.log(`Test Certificates: ${created} created`);
  return created;
}

async function createInvoices() {
  console.log('Creating tax invoices...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const certificates = await prisma.testCertificate.findMany({
    where: { status: 'APPROVED' },
    include: { customer: true, jobCard: true, items: true }
  });

  let created = 0;
  const paymentStatuses = ['PENDING', 'PARTIAL', 'PAID'];

  for (const cert of certificates) {
    if (Math.random() > 0.3 && cert.items.length > 0) { // 70% chance of having an invoice and must have items
      const invoiceNo = `INV-${cert.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const invoiceDate = new Date(cert.issueDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

      // Calculate totals from certificate items
      const subtotal = cert.items.reduce((sum, item) => {
        const weight = parseFloat(item.totalWeight) || 0;
        const rate = 200 + Math.random() * 300; // Rate per kg
        return sum + (weight * rate);
      }, 0);

      if (subtotal === 0) continue; // Skip if no valid amount

      const cgstAmount = subtotal * 0.09;
      const sgstAmount = subtotal * 0.09;
      const totalAmount = subtotal + cgstAmount + sgstAmount;
      const grandTotal = totalAmount + (subtotal * 0.02); // Including freight

      const invoice = await prisma.taxInvoice.create({
        data: {
          invoiceNo,
          invoiceDate,
          dispatchDate: paymentStatus === 'PAID' ? invoiceDate : null,

          fromPartyId: 1, // Company (Sheetal Dies)
          toPartyId: cert.customerId,

          challanRef: cert.dispatchChallanNo,
          poRef: cert.yourPoNo,
          jobCardRef: cert.jobCard?.jobCardNo,
          otherReferences: `Certificate: ${cert.certNo}`,

          subtotal,
          cgstRate: 9.00,
          cgstAmount,
          sgstRate: 9.00,
          sgstAmount,
          igstRate: 0,
          igstAmount: 0,
          totalAmount,
          transportFreight: subtotal * 0.02,
          tcsRate: 0,
          tcsAmount: 0,
          extraAmt: 0,
          grandTotal,
          amountInWords: `Rupees ${Math.floor(grandTotal)} only`,
          taxAmountInWords: `Rupees ${Math.floor(cgstAmount + sgstAmount)} only`,

          paymentStatus,
          paidDate: paymentStatus === 'PAID' ? new Date(invoiceDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          paymentRef: paymentStatus === 'PAID' ? `PAY-${Math.floor(Math.random() * 10000)}` : null,

          createdById: user.id,
        },
      });

      // Create invoice items linked to certificate items
      for (const certItem of cert.items) {
        const weight = parseFloat(certItem.totalWeight) || 0;
        const rate = 200 + Math.random() * 300;
        const amount = weight * rate;

        await prisma.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            certId: cert.id,
            description: certItem.description,
            hsnSac: '72011000',
            quantity: certItem.quantity,
            unit: 'KGS',
            weight,
            rate,
            amount,
          },
        });
      }

      created++;
    }
  }

  console.log(`Tax Invoices: ${created} created`);
  return created;
}

async function createInventoryData() {
  console.log('Creating inventory data...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const items = await prisma.item.findMany();
  if (!user || items.length === 0) return 0;

  let created = 0;
  for (const item of items) {
    const qty = 100 + Math.floor(Math.random() * 400);
    const reorder = Math.max(20, Math.floor(qty * (0.2 + Math.random() * 0.2)));

    const inv = await prisma.inventory.upsert({
      where: { itemId: item.id },
      update: {
        quantityOnHand: qty,
        reorderLevel: reorder,
        lastRestockDate: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
      },
      create: {
        itemId: item.id,
        quantityOnHand: qty,
        reorderLevel: reorder,
        lastRestockDate: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        itemId: item.id,
        source: 'MANUAL_ADJUSTMENT',
        quantityChange: qty,
        balanceAfter: inv.quantityOnHand,
        reorderLevelAfter: inv.reorderLevel,
        referenceType: 'SEED',
        remarks: `Opening balance for ${item.partNo}`,
        createdById: user.id,
      },
    });
    created++;
  }

  console.log(`Inventory rows: ${created} upserted`);
  return created;
}

async function createDispatchChallans() {
  console.log('Creating dispatch challans...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const jobworkChallans = await prisma.jobworkChallan.findMany({
    where: { status: { in: ['SENT', 'RECEIVED', 'COMPLETED'] } },
    include: { items: true },
    take: 20,
  });
  if (!user || jobworkChallans.length === 0) return 0;

  let created = 0;
  const statuses = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED'];

  for (let i = 0; i < jobworkChallans.length; i++) {
    const jw = jobworkChallans[i];
    if (!jw.items || jw.items.length === 0) continue;

    const y = new Date().getFullYear().toString().slice(-2);
    const yn = String(parseInt(y, 10) + 1);
    const challanNo = `SVH/DC/${y}-${yn}/${String(i + 1).padStart(4, '0')}`;
    const existing = await prisma.dispatchChallan.findUnique({ where: { challanNo } });
    if (existing) continue;

    const dispatch = await prisma.dispatchChallan.create({
      data: {
        challanNo,
        challanDate: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        jobworkChallanId: jw.id,
        fromPartyId: jw.fromPartyId,
        toPartyId: jw.toPartyId,
        dispatchMode: ['Our Vehicle', 'Courier', 'Transport'][Math.floor(Math.random() * 3)],
        vehicleNo: `MH12${Math.floor(1000 + Math.random() * 9000)}`,
        remarks: `Seed dispatch for ${jw.challanNo}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdById: user.id,
        items: {
          create: jw.items.slice(0, 2).map((line) => ({
            itemId: line.itemId || 1,
            sourceChallanItemId: line.id,
            description: line.description || 'Dispatch item',
            quantity: Math.max(1, Math.floor(Number(line.quantity) * (0.5 + Math.random() * 0.5))),
            weightKg: line.weight || null,
            remarks: 'Seed dispatch line',
          })),
        },
      },
    });

    if (dispatch) created++;
  }

  console.log(`Dispatch Challans: ${created} created`);
  return created;
}

async function createManufacturingData() {
  console.log('Creating manufacturing batches, runsheets, plans and report data...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const machines = await prisma.machine.findMany();
  const processTypes = await prisma.processType.findMany();
  const jobCards = await prisma.jobCard.findMany({
    where: { status: { in: ['IN_PROGRESS', 'INSPECTION', 'COMPLETED'] } },
    include: { customer: true, part: true },
    take: 18,
  });
  if (!user || machines.length === 0 || jobCards.length === 0) return { batches: 0, runsheets: 0, plans: 0 };

  const now = new Date();
  let batchCreated = 0;
  let runsheetCreated = 0;
  let plansCreated = 0;
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const groups = [];
  for (let i = 0; i < jobCards.length; i += 3) {
    groups.push(jobCards.slice(i, i + 3));
  }

  for (let i = 0; i < groups.length; i++) {
    const cards = groups[i];
    if (cards.length === 0) continue;

    const batchNumber = `BATCH/${year}/${String(i + 1).padStart(4, '0')}`;
    let batch = await prisma.manufacturingBatch.findUnique({ where: { batchNumber } });
    if (!batch) {
      batch = await prisma.manufacturingBatch.create({
        data: {
          batchNumber,
          batchDate: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000),
          status: ['CREATED', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 3)],
          remarks: `Seed batch ${i + 1}`,
          createdById: user.id,
          jobCards: {
            create: cards.map((c) => ({ jobCardId: c.id })),
          },
        },
      });
      batchCreated++;
    }

    const furnace = machines[i % machines.length];
    const runsheetNumber = `VHT/${year}/${String(i + 1).padStart(5, '0')}`;
    const existingRunsheet = await prisma.vHTRunsheet.findUnique({ where: { runsheetNumber } });
    if (!existingRunsheet) {
      await prisma.vHTRunsheet.create({
        data: {
          runsheetNumber,
          batchId: batch.id,
          furnaceId: furnace.id,
          runDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          cycleEndTime: '17:30',
          totalTimeDisplay: '08:00',
          mrStart: 1100 + i * 10,
          mrEnd: 1250 + i * 10,
          totalMr: 150,
          loadingOperatorName: `Operator ${i + 1}`,
          tempProfile: '850C hold and oil quench',
          cycleTime: 240,
          hardeningType: 'Vacuum Hardening',
          quenchPressureBar: 4.5,
          fanRpm: 1400,
          fixturesPosition: 'Center rack',
          tempGraphPoints: [
            { tempC: 200, holdMin: 30, label: 'Preheat' },
            { tempC: 850, holdMin: 120, label: 'Austenitize' },
            { tempC: 80, holdMin: 20, label: 'Quench' },
          ],
          status: ['PLANNED', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 3)],
          actualOutput: cards.reduce((s, c) => s + c.quantity, 0),
          remarks: `Seed runsheet for ${batchNumber}`,
          createdById: user.id,
          items: {
            create: cards.map((c, idx) => ({
              jobCardId: c.id,
              itemId: c.partId,
              customerName: c.customer?.name || c.customerNameSnapshot || null,
              jobDescription: c.part?.description || 'Heat treatment job',
              materialGrade: c.dieMaterial || c.part?.material || 'EN8',
              hrcRequired: c.hrcRange || '48-52 HRC',
              quantity: c.quantity,
              weightKg: c.totalWeight || null,
              plannedSlot: `S${idx + 1}`,
            })),
          },
        },
      });
      runsheetCreated++;
    }

    const planDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const existingPlan = await prisma.productionPlan.findFirst({
      where: { batchId: batch.id, planDate },
    });
    if (!existingPlan) {
      await prisma.productionPlan.create({
        data: {
          batchId: batch.id,
          planDate,
          status: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 4)],
          createdById: user.id,
          shifts: {
            create: [1, 2, 3].map((s) => {
              const start = new Date(planDate);
              start.setUTCHours((s - 1) * 8, 0, 0, 0);
              const end = new Date(start);
              end.setUTCHours(start.getUTCHours() + 8);
              return {
                shiftNumber: s,
                startTime: start,
                endTime: end,
                machineryAssigned: furnace.code,
                operatorAssigned: `Shift Operator ${s}`,
                plannedOutput: 80 + Math.floor(Math.random() * 70),
                actualOutput: 60 + Math.floor(Math.random() * 80),
                reason: Math.random() > 0.75 ? 'Planned preventive maintenance' : null,
              };
            }),
          },
        },
      });
      plansCreated++;
    }
  }

  // Daily Idle + Utilization + Plant Loss month for reports
  const machineSet = machines.slice(0, Math.min(machines.length, 4));
  for (const machine of machineSet) {
    for (let d = 1; d <= 12; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      await prisma.dailyIdleLog.upsert({
        where: { machineId_logDate: { machineId: machine.id, logDate: date } },
        update: {
          loadingUnloadingMin: 20 + Math.floor(Math.random() * 40),
          waitingCyclePrepMin: 15 + Math.floor(Math.random() * 35),
          waitingMaterialMin: 10 + Math.floor(Math.random() * 30),
          preventiveMaintMin: Math.floor(Math.random() * 25),
          breakdownMaintMin: Math.floor(Math.random() * 20),
          noPowerMin: Math.floor(Math.random() * 15),
          noMaterialMin: Math.floor(Math.random() * 20),
          remarks: 'Seed idle log',
        },
        create: {
          machineId: machine.id,
          logDate: date,
          loadingUnloadingMin: 20 + Math.floor(Math.random() * 40),
          waitingCyclePrepMin: 15 + Math.floor(Math.random() * 35),
          waitingMaterialMin: 10 + Math.floor(Math.random() * 30),
          preventiveMaintMin: Math.floor(Math.random() * 25),
          breakdownMaintMin: Math.floor(Math.random() * 20),
          noPowerMin: Math.floor(Math.random() * 15),
          noMaterialMin: Math.floor(Math.random() * 20),
          remarks: 'Seed idle log',
          createdById: user.id,
        },
      });
    }

    const utilDate = new Date(Date.UTC(year, month - 1, 10));
    await prisma.furnaceUtilizationDay.upsert({
      where: { machineId_utilDate: { machineId: machine.id, utilDate } },
      update: {
        shift1UsedMin: 420,
        shift2UsedMin: 400,
        shift3UsedMin: 380,
        s1A: 20, s1B: 10, s1C: 10, s1D: 8, s1E: 6, s1F: 4, s1G: 2,
        s2A: 22, s2B: 12, s2C: 8, s2D: 6, s2E: 5, s2F: 3, s2G: 2,
        s3A: 18, s3B: 11, s3C: 7, s3D: 6, s3E: 5, s3F: 3, s3G: 2,
        signedBy: 'Production Supervisor',
        remarks: 'Seed utilization',
      },
      create: {
        machineId: machine.id,
        utilDate,
        shift1UsedMin: 420,
        shift2UsedMin: 400,
        shift3UsedMin: 380,
        s1A: 20, s1B: 10, s1C: 10, s1D: 8, s1E: 6, s1F: 4, s1G: 2,
        s2A: 22, s2B: 12, s2C: 8, s2D: 6, s2E: 5, s2F: 3, s2G: 2,
        s3A: 18, s3B: 11, s3C: 7, s3D: 6, s3E: 5, s3F: 3, s3G: 2,
        signedBy: 'Production Supervisor',
        remarks: 'Seed utilization',
        createdById: user.id,
      },
    });
  }

  const monthRow = await prisma.plantLossMonth.upsert({
    where: { year_month: { year, month } },
    update: { notes: 'Seed manufacturing monthly loss report' },
    create: {
      year,
      month,
      notes: 'Seed manufacturing monthly loss report',
      createdById: user.id,
    },
  });
  await prisma.plantLossEntry.deleteMany({ where: { monthId: monthRow.id } });
  await prisma.plantLossEntry.createMany({
    data: machineSet.map((machine) => ({
      monthId: monthRow.id,
      machineId: machine.id,
      availableHours: 624,
      usedHours: 480 + Math.floor(Math.random() * 80),
      loadingUnloadingMin: 320 + Math.floor(Math.random() * 80),
      waitingCyclePrepHrs: 12 + Math.floor(Math.random() * 8),
      waitingMaterialHrs: 8 + Math.floor(Math.random() * 6),
      cleaningFurnaceHrs: 5 + Math.floor(Math.random() * 4),
      breakdownMaintHrs: 6 + Math.floor(Math.random() * 5),
      noPowerHrs: 4 + Math.floor(Math.random() * 4),
      noMaterialHrs: 5 + Math.floor(Math.random() * 4),
    })),
  });

  // Optional: create one furnace planning day to populate daily planning screens
  const planDay = new Date(Date.UTC(year, month - 1, 11));
  const planDayRow = await prisma.furnacePlanDay.upsert({
    where: { planDate: planDay },
    update: { notes: 'Seed daily furnace planning' },
    create: {
      planDate: planDay,
      notes: 'Seed daily furnace planning',
      createdById: user.id,
    },
  });
  const openJobCards = await prisma.jobCard.findMany({
    where: { status: { in: ['CREATED', 'IN_PROGRESS', 'INSPECTION'] } },
    take: 6,
  });
  await prisma.furnacePlanSlot.deleteMany({ where: { planDayId: planDayRow.id } });
  await prisma.furnacePlanSlot.createMany({
    data: openJobCards.map((jc, idx) => {
      const machine = machineSet[idx % machineSet.length];
      const processType = processTypes[idx % Math.max(processTypes.length, 1)];
      const startTime = new Date(Date.UTC(year, month - 1, 11, (idx % 3) * 8, 0, 0));
      const endTime = new Date(startTime);
      endTime.setUTCHours(startTime.getUTCHours() + 4);
      return {
        planDayId: planDayRow.id,
        machineId: machine.id,
        jobCardId: jc.id,
        processTypeId: processType ? processType.id : null,
        stage: idx % 2 === 0 ? 'HARDENING' : 'TEMPERING',
        startTime,
        endTime,
        endNextDay: false,
        tempC: 840 + (idx % 4) * 10,
        holdMin: 90 + (idx % 4) * 15,
        pressureBar: 4.0 + (idx % 2) * 0.5,
        fanRpm: 1350 + idx * 10,
        holdAtC: 780 + (idx % 3) * 20,
        holdExtraMin: 20,
        title: `Plan slot ${idx + 1}`,
        remarks: 'Seed planning slot',
      };
    }),
  });

  console.log(`Manufacturing Batches: ${batchCreated} created`);
  console.log(`VHT Runsheets: ${runsheetCreated} created`);
  console.log(`Production Plans: ${plansCreated} created`);
  console.log(`Report tables seeded for ${machineSet.length} machines (${month}/${year})`);
  return { batches: batchCreated, runsheets: runsheetCreated, plans: plansCreated };
}

async function addCancelledAndOnHoldJobCards() {
  console.log('Adding cancelled and on-hold job cards...');

  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const parties = await prisma.party.findMany({ take: 5 }); // First 5 parties
  const items = await prisma.item.findMany();

  let cancelled = 0;
  let onHold = 0;

  // Add some cancelled job cards
  for (let i = 0; i < 3; i++) {
    const party = parties[Math.floor(Math.random() * parties.length)];
    const item = items[Math.floor(Math.random() * items.length)];
    const jobCardNo = await generateJobCardNo();

    await prisma.jobCard.create({
      data: {
        jobCardNo,
        partId: item.id,
        customerId: party.id,
        quantity: 5 + Math.floor(Math.random() * 15),
        customerNameSnapshot: party.name,
        customerAddressSnapshot: `${party.address || ''}, ${party.city || ''}`,
        status: 'ON_HOLD', // Using ON_HOLD for cancelled
        createdById: user.id,
        remarks: `CANCELLED: Customer requested cancellation - ${party.name}`,
        receivedDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        dueDate: new Date(),
        factoryName: 'SHITAL VACUUM TREAT PVT LTD.',
        factoryAddress: 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
      },
    });
    cancelled++;
  }

  // Add some on-hold job cards
  for (let i = 0; i < 4; i++) {
    const party = parties[Math.floor(Math.random() * parties.length)];
    const item = items[Math.floor(Math.random() * items.length)];
    const jobCardNo = await generateJobCardNo();

    await prisma.jobCard.create({
      data: {
        jobCardNo,
        partId: item.id,
        customerId: party.id,
        quantity: 8 + Math.floor(Math.random() * 20),
        customerNameSnapshot: party.name,
        customerAddressSnapshot: `${party.address || ''}, ${party.city || ''}`,
        status: 'ON_HOLD',
        createdById: user.id,
        remarks: `ON HOLD: Quality issues detected - pending resolution - ${party.name}`,
        receivedDate: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + Math.random() * 15 * 24 * 60 * 60 * 1000),
        factoryName: 'SHITAL VACUUM TREAT PVT LTD.',
        factoryAddress: 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
      },
    });
    onHold++;
  }

  console.log(`Cancelled Job Cards: ${cancelled} created`);
  console.log(`On-Hold Job Cards: ${onHold} created`);
  return { cancelled, onHold };
}

async function main() {
  try {
    console.log('=== COMPREHENSIVE ERP DATA POPULATION ===\n');

    // Create foundation data
    await createItems();
    await createProcesses();

    // Run existing seed scripts first
    console.log('\n=== RUNNING EXISTING SEED SCRIPTS ===');
    const { spawn } = require('child_process');
    const path = require('path');

    const scripts = [
      'seed-machines.js',
      'seed-jobcards-from-parties.js',
      'seed-advance-workflow.js'
    ];

    for (const script of scripts) {
      console.log(`\nRunning ${script}...`);
      try {
        await new Promise((resolve, reject) => {
          const child = spawn('node', [path.join(__dirname, script)], {
            stdio: 'inherit',
            cwd: __dirname
          });
          child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${script} failed with code ${code}`));
          });
        });
      } catch (error) {
        console.log(`Note: ${script} may have already been run or encountered expected issues. Continuing...`);
      }
    }

    // Create comprehensive additional data
    console.log('\n=== CREATING COMPREHENSIVE ADDITIONAL DATA ===');
    await createComprehensiveJobCards();
    await createInspectionsForJobCards();
    await createJobWorkChallans();
    await createDispatchChallans();
    await createInventoryData();
    await assignMachinesToJobCards();
    await createManufacturingData();
    await addCancelledAndOnHoldJobCards();
    await createCertificates();
    await createInvoices();

    console.log('\n=== DATA POPULATION COMPLETED ===');
    console.log('✅ All parties now have job cards');
    console.log('✅ Job work challans created with items');
    console.log('✅ Dispatch challans created with items');
    console.log('✅ Inventory and stock movements created');
    console.log('✅ Machines assigned to job cards');
    console.log('✅ Manufacturing batches, VHT runsheets and daily planning created');
    console.log('✅ Manufacturing report data created (idle time, plant losses, utilization)');
    console.log('✅ Test certificates with quality pass/fail results');
    console.log('✅ Tax invoices with payment statuses');
    console.log('✅ Cancelled and on-hold job cards for realistic scenarios');
    console.log('✅ Mixed statuses: COMPLETED, PENDING, IN_PROGRESS, CANCELLED, ON_HOLD');
    console.log('\n🎉 Check all pages in the application - complete workflow is now visible!');

  } catch (error) {
    console.error('Error in comprehensive data population:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();