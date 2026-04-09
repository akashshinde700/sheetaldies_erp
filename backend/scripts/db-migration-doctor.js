const { spawnSync } = require('child_process');

function runPrismaMigrateStatus() {
  return spawnSync('npm run db:status', {
    encoding: 'utf8',
    shell: true,
    env: process.env,
  });
}

function printGuidance(output) {
  if (!output.includes('P3015')) {
    return false;
  }
  const match = output.match(/Could not find the migration file at ([^\r\n]+)\.\s*Please/i);
  const missingPath = match?.[1] || 'prisma/migrations/<migration>/migration.sql';

  console.error('\nMigration integrity check failed (P3015).\n');
  console.error(`Missing migration file: ${missingPath}\n`);
  console.error('Safe recovery steps:');
  console.error('1) Restore the exact missing migration folder from another clone/backup/CI artifact.');
  console.error('2) Re-run: npm run db:status');
  console.error('3) Do not create a guessed migration.sql by hand (checksum mismatch risk).');
  console.error('4) If file is unrecoverable, create a fresh baseline migration plan with DBA approval.\n');
  return true;
}

function main() {
  const result = runPrismaMigrateStatus();
  if (result.error) {
    console.error(result.error.message || 'Failed to execute migration status command.');
    process.exit(1);
  }
  const merged = `${result.stdout || ''}${result.stderr || ''}`;

  const handled = printGuidance(merged);
  if (!handled && merged.trim()) {
    process.stdout.write(merged);
  }

  process.exit(result.status || (handled ? 1 : 0));
}

main();
