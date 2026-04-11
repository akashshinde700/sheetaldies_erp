/**
 * Development-only helper to reset selected user passwords.
 * Usage: node reset-admin-password.js
 */
const bcrypt = require('bcryptjs');
const prisma  = require('./src/utils/prisma');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('reset-admin-password.js cannot be run in production');
  }

  const password = process.env.ADMIN_PASSWORD_RESET;
  if (!password) {
    throw new Error('Set ADMIN_PASSWORD_RESET before running reset-admin-password.js');
  }

  const hash = await bcrypt.hash(password, 10);

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

  console.log('\nDone! Updated the configured admin passwords.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
