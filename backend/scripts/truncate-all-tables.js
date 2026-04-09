/**
 * Truncates all application tables (MySQL). Schema and _prisma_migrations stay intact.
 *
 * SAFETY: set TRUNCATE_CONFIRM=yes (or pass --yes) or the script exits without changes.
 *
 *   PowerShell:  $env:TRUNCATE_CONFIRM='yes'; npm run db:truncate
 *   cmd:         set TRUNCATE_CONFIRM=yes && npm run db:truncate
 *
 * After a full wipe you must create users / masters again (register or SQL).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

/** Table names = Prisma @@map values (order irrelevant; FK checks disabled). */
const TABLES = [
  'shifts',
  'production_plans',
  'vht_runsheet_items',
  'vht_runsheets',
  'manufacturing_batch_jobcards',
  'manufacturing_batches',
  'grn_items',
  'grns',
  'purchase_order_items',
  'purchase_orders',
  'inventories',
  'invoice_items',
  'tax_invoices',
  'cert_inspection_results',
  'cert_items',
  'test_certificates',
  'dispatch_challan_items',
  'dispatch_challans',
  'challan_items',
  'jobwork_challans',
  'furnace_plan_slots',
  'furnace_plan_days',
  'furnace_utilization_days',
  'daily_idle_logs',
  'plant_loss_entries',
  'plant_loss_months',
  'heat_treatment_processes',
  'incoming_inspections',
  'job_step_tracking',
  'job_workflows',
  'workflow_transitions',
  'workflow_steps',
  'workflow_templates',
  'job_cards',
  'audit_logs',
  'items',
  'machines',
  'process_types',
  'parties',
  'users',
];

async function main() {
  const ok =
    process.env.TRUNCATE_CONFIRM === 'yes' ||
    process.argv.includes('--yes');
  if (!ok) {
    console.error(
      'Refusing to truncate: set TRUNCATE_CONFIRM=yes or pass --yes\n' +
        'Example (PowerShell): $env:TRUNCATE_CONFIRM=\'yes\'; npm run db:truncate'
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set (.env in backend folder).');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of TABLES) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
      console.log('Truncated:', t);
    }
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\nAll listed tables truncated. _prisma_migrations was not touched.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
