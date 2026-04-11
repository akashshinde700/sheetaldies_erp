const prisma = require('../utils/prisma');
const { toInt, toNum } = require('../utils/normalize');
const { formatErrorResponse, getStatusCode, formatListResponse, parsePagination } = require('../utils/validation');

/** Minimal customer row from job card etc. — allowed for OPERATOR + MANAGER */
exports.quickCreateCustomer = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const address = (req.body.address || '').trim();
    const email = (req.body.email || '').trim() || null;
    if (!name || !address) {
      return res.status(400).json({ success: false, message: 'Name and address are required.' });
    }

    const existing = await prisma.party.findFirst({
      where: {
        name,
        partyType: { in: ['CUSTOMER', 'BOTH'] },
      },
    });
    if (existing) {
      return res.json({ success: true, data: existing, reused: true });
    }

    const party = await prisma.party.create({
      data: {
        name,
        address,
        email,
        partyType: 'CUSTOMER',
      },
    });
    res.status(201).json({ success: true, data: party, reused: false });
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
