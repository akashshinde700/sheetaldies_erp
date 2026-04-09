/**
 * Seeds 15 demo machines (VHT / heat-treat shop). Idempotent: upserts by unique code.
 *
 *   npm run db:seed-machines
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MACHINES = [
  { code: 'VHT-01', name: 'Vacuum hardening furnace – Line 1', type: 'Vacuum furnace', make: 'SECO/WARWICK' },
  { code: 'VHT-02', name: 'Vacuum hardening furnace – Line 2', type: 'Vacuum furnace', make: 'ALD' },
  { code: 'VHT-03', name: 'Vacuum tempering furnace', type: 'Vacuum furnace', make: 'Ipsen' },
  { code: 'TEMP-01', name: 'Air circulation tempering oven', type: 'Tempering', make: 'Elstein' },
  { code: 'TEMP-02', name: 'Batch tempering oven (electric)', type: 'Tempering', make: 'Local' },
  { code: 'NIT-01', name: 'Plasma nitriding unit', type: 'Surface treatment', make: 'Plateg' },
  { code: 'SR-01', name: 'Stress relieving furnace', type: 'Stress relieve', make: 'Maharashtra oven' },
  { code: 'ANN-01', name: 'Annealing / normalising furnace', type: 'Annealing', make: 'Boschung' },
  { code: 'IQ-01', name: 'Integral quench furnace', type: 'Atmosphere', make: 'Surface Combustion' },
  { code: 'SALT-01', name: 'Salt bath hardening', type: 'Salt bath', make: 'Ajax' },
  { code: 'SUB-01', name: 'Sub-zero / cryo treatment chamber', type: 'Cryogenic', make: 'Taylor-Wharton' },
  { code: 'BLAST-01', name: 'Shot blasting cabinet', type: 'Finishing', make: 'Guyson' },
  { code: 'MPI-01', name: 'MPI / crack detection station', type: 'Inspection', make: 'Magnaflux' },
  { code: 'CLN-01', name: 'Ultrasonic / soak cleaning line', type: 'Cleaning', make: 'In-house' },
  { code: 'BELL-01', name: 'Bell annealing furnace', type: 'Bell furnace', make: 'Ebner' },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const m of MACHINES) {
    const existing = await prisma.machine.findUnique({ where: { code: m.code } });
    await prisma.machine.upsert({
      where: { code: m.code },
      create: {
        code: m.code,
        name: m.name,
        type: m.type,
        make: m.make,
        isActive: true,
      },
      update: {
        name: m.name,
        type: m.type,
        make: m.make,
        isActive: true,
      },
    });
    if (existing) updated += 1;
    else created += 1;
  }

  console.log(`Machines: ${created} created, ${updated} updated. Seed list: ${MACHINES.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
