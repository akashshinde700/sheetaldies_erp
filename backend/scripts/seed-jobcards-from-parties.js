/**
 * Creates one job card per party for the first 5 CUSTOMER, 5 VENDOR, 5 BOTH in the DB
 * (uses parties you already inserted). Idempotent: skips if a seed job card already exists for that party.
 *
 * Needs: at least one User (run `npm run db:ensure-admin` for admin@sheetaldies.com), at least one Item (creates minimal item if none).
 *
 *   npm run db:seed-jobcards
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const REMARK_PREFIX = 'Seed: party-type demo —';

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

function buildPartyAddress(p) {
  const line = [p.address, p.city, p.state, p.pinCode].filter(Boolean).join(', ');
  return line || p.address || '';
}

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  if (!user) {
    console.error(
      'No user in database. Run:\n  npm run db:ensure-admin\nThen re-run this script.\n' +
        '(Default login: admin@sheetaldies.com / Admin@123)'
    );
    process.exit(1);
  }

  let item = await prisma.item.findFirst({ orderBy: { id: 'asc' } });
  if (!item) {
    item = await prisma.item.create({
      data: {
        partNo: `SEED-JC-${Date.now()}`,
        description: 'Demo part for seeded job cards',
        unit: 'NOS',
        isActive: true,
      },
    });
    console.log('Created seed item:', item.partNo);
  }

  const [customers, vendors, both] = await Promise.all([
    prisma.party.findMany({ where: { partyType: 'CUSTOMER' }, orderBy: { id: 'asc' }, take: 5 }),
    prisma.party.findMany({ where: { partyType: 'VENDOR' }, orderBy: { id: 'asc' }, take: 5 }),
    prisma.party.findMany({ where: { partyType: 'BOTH' }, orderBy: { id: 'asc' }, take: 5 }),
  ]);

  const expected = { CUSTOMER: 5, VENDOR: 5, BOTH: 5 };
  const got = { CUSTOMER: customers.length, VENDOR: vendors.length, BOTH: both.length };
  for (const k of Object.keys(expected)) {
    if (got[k] < expected[k]) {
      console.warn(
        `Warning: need ${expected[k]} ${k} parties, found ${got[k]}. Only seeding ${got[k]} job card(s) for that type.`
      );
    }
  }

  const groups = [
    { label: 'CUSTOMER', parties: customers },
    { label: 'VENDOR', parties: vendors },
    { label: 'BOTH', parties: both },
  ];

  let created = 0;
  let skipped = 0;

  for (const { label, parties } of groups) {
    for (const p of parties) {
      const existing = await prisma.jobCard.findFirst({
        where: {
          customerId: p.id,
          remarks: { startsWith: REMARK_PREFIX },
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const jobCardNo = await generateJobCardNo();
      await prisma.jobCard.create({
        data: {
          jobCardNo,
          partId: item.id,
          customerId: p.id,
          quantity: 10,
          customerNameSnapshot: p.name,
          customerAddressSnapshot: buildPartyAddress(p),
          contactEmail: p.email || null,
          status: 'CREATED',
          createdById: user.id,
          remarks: `${REMARK_PREFIX} ${label}`,
          receivedDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 86400000),
          factoryName: 'SHITAL VACUUM TREAT PVT LTD.',
          factoryAddress: 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
        },
      });
      created += 1;
      console.log(`Created ${jobCardNo} → ${p.name} (${label})`);
    }
  }

  console.log(`\nDone: ${created} job card(s) created, ${skipped} skipped (already seeded for that party).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
