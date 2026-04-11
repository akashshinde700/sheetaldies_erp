/**
 * Ensures an admin login exists (upsert by email).
 * ADMIN_EMAIL and ADMIN_PASSWORD must be set explicitly.
 *
 *   npm run db:ensure-admin
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Administrator';

async function main() {
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set before running ensure-admin-user.js');
  }
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
