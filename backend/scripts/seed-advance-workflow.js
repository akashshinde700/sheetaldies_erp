/**
 * Pushes demo data forward after job cards exist:
 *  1) Seed job cards (remarks start with "Seed: party-type demo") → Incoming inspection PASS + status INSPECTION
 *  2) Up to 3 sample Job Work challans (no jobCardId) so Job Work list is non-empty — From/To parties from DB
 *
 *   npm run db:advance-workflow
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SEED_JOB_REMARK = 'Seed: party-type demo';

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

async function ensureInspections() {
  const cards = await prisma.jobCard.findMany({
    where: { remarks: { startsWith: SEED_JOB_REMARK } },
    orderBy: { id: 'asc' },
    include: { inspection: { select: { id: true } }, part: { select: { id: true, partNo: true, description: true } } },
  });

  let added = 0;
  let skipped = 0;

  for (const card of cards) {
    if (card.inspection) {
      skipped += 1;
      continue;
    }

    await prisma.incomingInspection.create({
      data: {
        jobCardId: card.id,
        catNormal: true,
        procHardening: true,
        procTempering: true,
        visualBefore: true,
        visualAfter: true,
        requiredHardnessMin: 52,
        requiredHardnessMax: 56,
        hardnessUnit: 'HRC',
        achievedHardness: 54,
        inspectionStatus: 'PASS',
        inspectionDate: new Date(),
        incomingInspectionBy: 'QC (seed)',
        finalInspectionBy: 'QC (seed)',
        remarks: 'Seed: demo incoming inspection — OK for trial',
        packedQty: card.quantity || null,
      },
    });

    await prisma.jobCard.update({
      where: { id: card.id },
      data: { status: 'INSPECTION' },
    });
    added += 1;
    console.log(`Inspection + INSPECTION: ${card.jobCardNo}`);
  }

  console.log(`\nInspections: ${added} created, ${skipped} already had inspection (${cards.length} seed job cards).`);
  return { cards, added, skipped };
}

async function ensureSampleChallans(cards) {
  const fromParty = await prisma.party.findFirst({
    where: { partyType: { in: ['CUSTOMER', 'BOTH'] } },
    orderBy: { id: 'asc' },
  });
  const toParty = await prisma.party.findFirst({
    where: { partyType: { in: ['VENDOR', 'BOTH'] } },
    orderBy: { id: 'asc' },
  });
  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  const item = await prisma.item.findFirst({ orderBy: { id: 'asc' } });

  if (!fromParty || !toParty || !user) {
    console.log('\nSkip sample challans: need at least one customer/both, one vendor/both, and one user.');
    return { created: 0 };
  }
  if (!item) {
    console.log('\nSkip sample challans: no item in DB.');
    return { created: 0 };
  }

  const existingSeedJw = await prisma.jobworkChallan.count({
    where: { processingNotes: { contains: 'Seed: demo challan' } },
  });
  if (existingSeedJw >= 3) {
    console.log(`\nSample jobwork challans: 0 created (${existingSeedJw} seed demo challan(s) already in DB, max 3).`);
    return { created: 0 };
  }

  const need = 3 - existingSeedJw;
  let created = 0;

  for (let i = 0; i < need; i++) {
    const challanNo = await generateChallanNo();
    const qty = 10 + i * 2;
    const rate = 250 + i * 50;
    const amount = qty * rate;

    await prisma.jobworkChallan.create({
      data: {
        challanNo,
        challanDate: new Date(),
        jobCardId: null,
        fromPartyId: fromParty.id,
        toPartyId: toParty.id,
        transportMode: 'Road',
        processingNotes: `Seed: demo challan ${i + 1} — open Job Work to edit or link a job card`,
        subtotal: amount,
        handlingCharges: 0,
        totalValue: amount,
        grandTotal: amount * 1.18,
        cgstRate: 9,
        sgstRate: 9,
        cgstAmount: amount * 0.09,
        sgstAmount: amount * 0.09,
        status: 'DRAFT',
        createdById: user.id,
        items: {
          create: [
            {
              itemId: item.id,
              description: item.description || 'Demo line',
              drawingNo: `DW-SEED-${i + 1}`,
              quantity: qty,
              qtyOut: qty,
              uom: 'KGS',
              weight: qty * 0.5,
              rate,
              amount,
            },
          ],
        },
      },
    });
    created += 1;
    console.log(`Job Work challan: ${challanNo} (${fromParty.name} → ${toParty.name})`);
  }

  if (created > 0) console.log(`\nSample challans: ${created} created.`);
  return { created };
}

async function main() {
  const ins = await ensureInspections();
  const jw = await ensureSampleChallans(ins.cards);

  const nothingNew = (ins.added || 0) === 0 && (jw?.created || 0) === 0;
  if (nothingNew) {
    console.log('\n---');
    console.log('Already up to date — koi naya data add nahi kiya (ye normal hai).');
    console.log('Pehli baar jo inspections + 3 demo challans bane the, wo DB mein pehle se hain.');
    console.log('Script dubara chalane par sirf MISSING cheezein add hoti hain.');
    console.log('Aage ka kaam ab app se: Certificates → Invoices → Dispatch, ya naye job cards.');
    console.log('---');
  } else {
    console.log('\nNext in app: Quality → job card inspection; Job Work → challans; phir certificates / invoice.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
