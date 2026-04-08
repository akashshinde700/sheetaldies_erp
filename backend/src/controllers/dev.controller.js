const prisma = require('../utils/prisma');

exports.seedImageData = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Dev seed endpoint not allowed in production.' });
  }

  try {
    // Parties (use schema fields phone/email where needed)
    const toParty = await prisma.party.upsert({
      where: { partyCode: 'POLAR-HT' },
      update: {},
      create: {
        partyCode: 'POLAR-HT',
        name: 'Polar Heat Treatment',
        partyType: 'BOTH',
        phone: '9876543210',
        address: 'New Mumbai',
      },
    });
    const fromParty = await prisma.party.upsert({
      where: { partyCode: 'SHEETAL-DIES' },
      update: {},
      create: {
        partyCode: 'SHEETAL-DIES',
        name: 'Sheetal Dies & Tools',
        partyType: 'BOTH',
        phone: '9123456780',
        address: 'Pune',
      },
    });
    const customer = await prisma.party.upsert({
      where: { partyCode: 'GLOBAL-BEARINGS' },
      update: {},
      create: {
        partyCode: 'GLOBAL-BEARINGS',
        name: 'Global Bearings Pvt Ltd',
        partyType: 'CUSTOMER',
        phone: '9988776655',
        address: 'Aurangabad',
      },
    });

    // Machine and Item
    const machine = await prisma.machine.upsert({
      where: { code: 'VMC-500' },
      update: {},
      create: { code: 'VMC-500', name: 'Vertical Machining Center', type: 'VMC', make: 'BFW' },
    });

    const item = await prisma.item.upsert({
      where: { partNo: 'VB-100' },
      update: {},
      create: { partNo: 'VB-100', description: 'Valve Body, % material specs', hsnCode:'998898', unit:'KGS' },
    });

    // Process (optional) - process type is ProcessType in schema
    const processType = await prisma.processType.upsert({
      where: { code: 'HT97' },
      update: {},
      create: {
        code: 'HT97',
        name: 'Vacuum Hardening + Tempering',
        isActive: true,
        pricePerKg: 250,
      },
    });

    const packet = [];
    const baseCreatedBy = req.user?.id || 1;

    for (let i = 1; i <= 10; i += 1) {
      const stamp = Date.now() + i;
      const jobCard = await prisma.jobCard.create({
        data: {
          jobCardNo: `JC-${stamp}`,
          partId: item.id,
          dieNo: `D-${215 + i}`,
          yourNo: `CUST-14${i}`,
          heatNo: `H9${i}`,
          dieMaterial: 'H13',
          customerId: customer.id,
          operationNo: `OP-${12 + i}`,
          drawingNo: `DRW-99${i}`,
          machineId: machine.id,
          operatorName: `Rajesh ${i}`,
          quantity: 150 + i * 10,
          totalWeight: 95.5 + i,
          startDate: new Date(),
          receivedDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          operationMode: 'NORMAL',
          remarks: `Process as per image set ${i}`,
          status: i % 5 === 0 ? 'COMPLETED' : 'SENT_FOR_JOBWORK',
          createdById: baseCreatedBy,
        },
      });

      const challan = await prisma.jobworkChallan.create({
        data: {
          challanNo: `SDT/JW/${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          challanDate: new Date(),
          jobCardId: jobCard.id,
          fromPartyId: fromParty.id,
          toPartyId: toParty.id,
          invoiceChNo: `INV-2026-00${i}`,
          invoiceChDate: new Date(),
          transportMode: 'Courier',
          vehicleNo: `MH12AB${1000 + i}`,
          dispatchDate: new Date(),
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          processingNotes: 'Vacuum hardening + tempering as per image',
          deliveryPerson: 'Suresh',
          receivedDate: new Date(),
          natureOfProcess: 'Hardening + Tempering',
          qtyReturned: 0,
          reworkQty: 0,
          scrapQtyKg: 0,
          scrapDetails: '',
          processorSign: 'S Kumar',
          subtotal: 30000 + i * 500,
          handlingCharges: 150,
          totalValue: 30150 + i * 500,
          cgstRate: 9,
          sgstRate: 9,
          cgstAmount: (30000 + i * 500) * 0.09,
          sgstAmount: (30000 + i * 500) * 0.09,
          igstRate: 0,
          igstAmount: 0,
          grandTotal: (30000 + i * 500) * 1.18 + 250,
          status: 'SENT',
          createdById: baseCreatedBy,
          items: {
            create: [{
              itemId: item.id,
              description: 'Valve Body',
              drawingNo: `DW-40${i}`,
              material: 'H13',
              hrc: '54',
              woNo: `WO-08${i}`,
              hsnCode: '998898',
              quantity: 120,
              qtyOut: 120,
              uom: 'KGS',
              weight: 95.5,
              rate: 250,
              amount: 30000,
            }],
          },
        },
      });

      const inspection = await prisma.incomingInspection.create({
        data: {
          jobCardId: jobCard.id,
          catNormal: true,
          procStressRelieving: true,
          procHardening: true,
          procTempering: true,
          visualInspection: true,
          requiredHardnessMin: 52,
          requiredHardnessMax: 54,
          hardnessUnit: 'HRC',
          achievedHardness: 53,
          packedQty: 120,
          packedBy: 'Ramesh',
          incomingInspectionBy: 'Deepak',
          finalInspectionBy: 'Akhilesh',
          inspectionDate: new Date(),
          remarks: 'All checks OK as per images',
          inspectionStatus: 'PASS',
        },
      });

      const cert = await prisma.testCertificate.create({
        data: {
          jobCardId: jobCard.id,
          certNo: `SVT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          yourPoNo: `PO-90${i}${i}`,
          yourPoDate: new Date(),
          yourRefNo: `REF-5${i}`,
          issueNo: `IC-12${i}`,
          issueDate: new Date(),
          checkedBy: 'Ramesh',
          customerId: customer.id,
          issuedByPartyId: fromParty.id,
          dieMaterial: 'H13',
          operatorMode: 'AUTO',
          catNormal: true,
          procStressRelieving: true,
          procHardening: true,
          procTempering: true,
          hardnessMin: 52,
          hardnessMax: 54,
          hardnessUnit: 'HRC',
          packedQty: 120,
          packedBy: 'Ajay',
          approvedBy: 'Kiran',
          issuedTo: 'Global Bearings Warehouse',
          heatNo: `H-${778 + i}`,
          dispatchMode: 'Courier',
          dispatchChallanNo: challan.challanNo,
          dispatchChallanDate: new Date(),
          dispatchedThrough: 'DTDC',
          createdById: baseCreatedBy,
          items: {
            create: [{
              description: 'Valve Body',
              quantity: 120,
              weightPerPc: 0.8,
              totalWeight: 96,
              samplingPlan: 'AQL 1.5',
              remarks: 'Passed',
            }],
          },
          inspectionResults: {
            create: [{
              inspectionType: 'Visual',
              parameter: 'Surface Finish',
              requiredValue: 'OK',
              achievedValue: 'OK',
              result: 'OK',
              finalInspection: 'Ramesh',
            }],
          },
        },
      });

      const invoice = await prisma.taxInvoice.create({
        data: {
          invoiceNo: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          invoiceDate: new Date(),
          fromPartyId: fromParty.id,
          toPartyId: customer.id,
          challanId: challan.id,
          challanRef: challan.challanNo,
          poRef: `PO-90${i}${i}`,
          jobCardRef: jobCard.jobCardNo,
          dispatchDocNo: `DC-4${i}8`,
          eWayBillNo: `EWB12345678${i}`,
          cgstRate: 9,
          sgstRate: 9,
          igstRate: 0,
          transportFreight: 250,
          tcsRate: 0.5,
          extraAmt: 80,
          subtotal: 30000 + i * 500,
          cgstAmount: (30000 + i * 500) * 0.09,
          sgstAmount: (30000 + i * 500) * 0.09,
          igstAmount: 0,
          totalAmount: (30000 + i * 500) * 1.18 + 330,
          paymentStatus: 'PENDING',
          createdById: baseCreatedBy,
        },
      });

      packet.push({ jobCard, challan, inspection, cert, invoice });
    }

    res.json({ success: true, message: '10 image-related seed records inserted into database.', data: { fromParty, toParty, customer, machine, item, processType, inserted: packet } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not seed image data.', error: err.message });
  }
};

// Check if seed data exists
exports.checkSeedStatus = async (req, res) => {
  try {
    const counts = await Promise.all([
      prisma.party.count(),
      prisma.item.count(),
      prisma.machine.count(),
      prisma.processType.count(),
      prisma.jobCard.count(),
      prisma.jobworkChallan.count(),
      prisma.incomingInspection.count(),
      prisma.testCertificate.count(),
      prisma.taxInvoice.count(),
    ]);

    res.json({
      success: true,
      data: {
        parties: counts[0],
        items: counts[1],
        machines: counts[2],
        processTypes: counts[3],
        jobCards: counts[4],
        jobworkChallans: counts[5],
        inspections: counts[6],
        certificates: counts[7],
        invoices: counts[8],
        seedExists: counts[4] >= 10,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not check seed status.', error: err.message });
  }
};