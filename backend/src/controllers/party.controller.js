const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');
const { encryptPartyData, decryptPartyData } = require('../utils/piiHandlerExtended');

/** Minimal customer row from job card etc. — allowed for OPERATOR + MANAGER */
exports.quickCreateCustomer = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const address = (req.body.address || '').trim();
    const email = (req.body.email || '').trim() || null;
    const partyType = String(req.body.partyType || 'CUSTOMER').toUpperCase();
    const rates = Array.isArray(req.body.rates) ? req.body.rates : [];
    if (!name || !address) {
      return res.status(400).json({ success: false, message: 'Name and address are required.' });
    }

    if (!['CUSTOMER', 'VENDOR', 'BOTH'].includes(partyType)) {
      return res.status(400).json({ success: false, message: 'Invalid party type.' });
    }

    const existing = await prisma.party.findFirst({
      where: {
        name,
        partyType: { in: partyType === 'CUSTOMER' ? ['CUSTOMER', 'BOTH'] : partyType === 'VENDOR' ? ['VENDOR', 'BOTH'] : ['BOTH'] },
      },
    });
    if (existing) {
      return res.json({ success: true, data: existing, reused: true });
    }

    // Create party + rates atomically so partial failure leaves no orphaned party
    const party = await prisma.$transaction(async (tx) => {
      const created = await tx.party.create({
        data: encryptPartyData({ name, address, email, partyType }),
      });
      if (rates.length > 0) {
        for (const row of rates) {
          const ptId = toInt(row.processTypeId);
          if (!ptId) continue;
          const rateData = {
            pricePerKg: row.pricePerKg != null && row.pricePerKg !== '' ? toNum(row.pricePerKg) : null,
            pricePerPc: row.pricePerPc != null && row.pricePerPc !== '' ? toNum(row.pricePerPc) : null,
            lotPrice:  row.lotPrice  != null && row.lotPrice  !== '' ? toNum(row.lotPrice)  : null,
          };
          await tx.partyProcessRate.upsert({
            where: { partyId_processTypeId: { partyId: created.id, processTypeId: ptId } },
            update: rateData,
            create: { partyId: created.id, processTypeId: ptId, ...rateData },
          });
        }
      }
      return created;
    });

    res.status(201).json({ success: true, data: decryptPartyData(party), reused: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create party.' });
  }
};

/** Job cards, invoices, certificates, challans, dispatch — for customer 360 view */
exports.activity = async (req, res) => {
  try {
    const partyId = toInt(req.params.id);
    if (Number.isNaN(partyId)) {
      return res.status(400).json({ success: false, message: 'Invalid party id.' });
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });

    const [
      jobCards,
      invoices,
      certificates,
      jobworkAsFrom,
      jobworkAsTo,
      dispatchTo,
      dispatchFrom,
    ] = await Promise.all([
      prisma.jobCard.findMany({
        where: { customerId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          jobCardNo: true,
          status: true,
          quantity: true,
          operationMode: true,
          createdAt: true,
          receivedDate: true,
          part: { select: { partNo: true, description: true } },
        },
      }),
      prisma.taxInvoice.findMany({
        where: { toPartyId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          invoiceNo: true,
          grandTotal: true,
          paymentStatus: true,
          invoiceDate: true,
          items: {
            select: {
              description: true,
              amount: true,
              processType: { select: { name: true, code: true } },
            },
          },
        },
      }),
      prisma.testCertificate.findMany({
        where: { customerId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          certNo: true,
          issueNo: true,
          issueDate: true,
          status: true,
          jobCard: { select: { jobCardNo: true } },
        },
      }),
      prisma.jobworkChallan.findMany({
        where: { fromPartyId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          challanNo: true,
          challanDate: true,
          status: true,
          totalValue: true,
          toParty: { select: { name: true } },
        },
      }),
      prisma.jobworkChallan.findMany({
        where: { toPartyId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          challanNo: true,
          challanDate: true,
          status: true,
          totalValue: true,
          fromParty: { select: { name: true } },
        },
      }),
      prisma.dispatchChallan.findMany({
        where: { toPartyId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, challanNo: true, challanDate: true, status: true },
      }),
      prisma.dispatchChallan.findMany({
        where: { fromPartyId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, challanNo: true, challanDate: true, status: true },
      }),
    ]);

    const jcByMode = {};
    for (const jc of jobCards) {
      const m = (!jc.operationMode || jc.operationMode === '') ? '—' : jc.operationMode;
      jcByMode[m] = (jcByMode[m] || 0) + 1;
    }

    let invTotal = 0;
    const processFromItems = {};
    for (const inv of invoices) {
      invTotal += toNum(inv.grandTotal, 0);
      for (const li of inv.items || []) {
        const pname = li.processType?.name || li.processType?.code || li.description || '—';
        if (!processFromItems[pname]) processFromItems[pname] = { count: 0, amount: 0 };
        processFromItems[pname].count += 1;
        processFromItems[pname].amount += toNum(li.amount, 0);
      }
    }

    res.json({
      success: true,
      data: {
        party,
        summary: {
          jobCards: jobCards.length,
          invoices: invoices.length,
          certificates: certificates.length,
          jobworkChallansPartySent: jobworkAsFrom.length,
          jobworkChallansPartyReceived: jobworkAsTo.length,
          dispatchDeliveredToParty: dispatchTo.length,
          dispatchShippedFromParty: dispatchFrom.length,
          billedTotal: invTotal,
          jobCardsByOperationMode: Object.entries(jcByMode).map(([name, count]) => ({ name, count })),
          invoiceLinesByProcess: Object.entries(processFromItems).map(([name, v]) => ({ name, ...v })),
        },
        jobCards,
        invoices,
        certificates,
        jobworkAsFromParty: jobworkAsFrom,
        jobworkAsToParty: jobworkAsTo,
        dispatchToParty: dispatchTo,
        dispatchFromParty: dispatchFrom,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load party activity.' });
  }
};
