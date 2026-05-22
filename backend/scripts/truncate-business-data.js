/**
 * Truncate all business data — keeps Users, ProcessType, Machine only.
 * Run: node backend/scripts/truncate-business-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting truncate...');

  // Disable FK checks for MySQL
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

  const tables = [
    'invoice_items',
    'tax_invoices',
    'cert_items',
    'cert_inspection_results',
    'test_certificates',
    'inspection_heat_processes',
    'incoming_inspections',
    'vht_runsheet_items',
    'vht_runsheets',
    'challan_items',
    'dispatch_challan_items',
    'dispatch_challans',
    'jobwork_challans',
    'job_cards',
    'manufacturing_batch_job_cards',
    'manufacturing_batches',
    'customer_quote_items',
    'customer_quotes',
    'party_process_rates',
    'parties',
    // Clear auto-created parts (JOBCARD-* partNo items)
    'items',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
      // Reset auto-increment
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      console.log(`  ✓ ${table}`);
    } catch (err) {
      console.log(`  ✗ ${table}: ${err.message}`);
    }
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

  console.log('\nDone! Users, ProcessType, Machine data kept intact.');
  console.log('Login: admin@sheetaldies.com / Admin@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
