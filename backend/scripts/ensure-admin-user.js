/**
 * Ensures the default admin login exists (upsert by email).
 * Defaults match your setup; override with ADMIN_EMAIL / ADMIN_PASSWORD in .env for other environments.
 *
 *   npm run db:ensure-admin
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const email = (process.env.ADMIN_EMAIL || 'admin@sheetaldies.com').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'Admin@123';
const name = process.env.ADMIN_NAME || 'Administrator';

async function main() {
  const hash = bcrypt.hashSync(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      password: hash,
      role: 'ADMIN',
      isActive: true,
    },
    update: {
      name,
      password: hash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`Admin ready: ${user.email} (role ${user.role}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
