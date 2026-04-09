/**
 * Assigns each job card a machine (round-robin over active machines) and sets drawingNo:
 *   1) Item (part) master drawing_no if present
 *   2) else DWG-{partNo} from the linked item
 *   3) else DWG-{jobCardNo}
 *
 * Drawing no on the job card is stored on job_cards.drawing_no — it does not auto-pull from
 * Items in the UI today; this script syncs from part when part has drawing, else generates.
 *
 *   npm run db:assign-jobcard-machine-drawing
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function deriveDrawingNo(card) {
  const part = card.part;
  const fromItem = part?.drawingNo?.trim();
  if (fromItem) return fromItem.slice(0, 100);
  const pn = part?.partNo?.trim();
  if (pn) {
    const base = pn.replace(/\s+/g, '-').slice(0, 50);
    return `DWG-${base}-${card.jobCardNo}`.slice(0, 100);
  }
  return `DWG-${card.jobCardNo}`;
}

async function main() {
  const machines = await prisma.machine.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });
  if (machines.length === 0) {
    console.error('No active machines. Run: npm run db:seed-machines');
    process.exit(1);
  }

  const cards = await prisma.jobCard.findMany({
    orderBy: { id: 'asc' },
    include: { part: { select: { partNo: true, drawingNo: true } } },
  });

  if (cards.length === 0) {
    console.log('No job cards to update.');
    return;
  }

  let n = 0;
  for (let i = 0; i < cards.length; i++) {
    const machine = machines[i % machines.length];
    const drawingNo = deriveDrawingNo(cards[i]);
    await prisma.jobCard.update({
      where: { id: cards[i].id },
      data: {
        machineId: machine.id,
        drawingNo,
      },
    });
    console.log(`${cards[i].jobCardNo} → machine ${machine.code} | drawing: ${drawingNo}`);
    n += 1;
  }

  console.log(`\nUpdated ${n} job card(s) using ${machines.length} machine(s) in rotation.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
