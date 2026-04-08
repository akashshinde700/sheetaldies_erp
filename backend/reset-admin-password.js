/**
 * Run this script once to reset all default user passwords to ***REDACTED-SEE-ENV***
 * Usage: node reset-admin-password.js
 */
const bcrypt = require('bcryptjs');
const prisma  = require('./src/utils/prisma');

async function main() {
  const hash = await bcrypt.hash('***REDACTED-SEE-ENV***', 10);

  const emails = [
    'admin@sheetaldies.com',
    'manager@sheetaldies.com',
    'operator@sheetaldies.com',
  ];

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({ where: { email }, data: { password: hash } });
      console.log(`✓ Password reset for ${email}`);
    } else {
      // Create if not exists
      await prisma.user.create({
        data: {
          name:     email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
          email,
          password: hash,
          role:     email.startsWith('admin') ? 'ADMIN' : email.startsWith('manager') ? 'MANAGER' : 'OPERATOR',
        },
      });
      console.log(`✓ Created user ${email}`);
    }
  }

  console.log('\nDone! Login with: admin@sheetaldies.com / ***REDACTED-SEE-ENV***');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
