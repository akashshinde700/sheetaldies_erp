/**
 * Seeds demo parties (customers, vendors, both). Idempotent: skips if GSTIN already exists.
 *
 *   npm run db:seed-parties
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PARTIES = [
  { type: 'Customer', name: 'Sheetal Dies & Tools Pvt Ltd', gst: '27AANCS2087B1ZA', state: 'Maharashtra', address: 'PCNTDA Bhosari, Pune', contact: '9892701280' },
  { type: 'Customer', name: 'Precision Tools India Pvt Ltd', gst: '27AAACP1234A1ZV', state: 'Maharashtra', address: 'MIDC Bhosari, Pune', contact: '9823012345' },
  { type: 'Customer', name: 'Global Engineering Works', gst: '27AABCG5678K1ZX', state: 'Gujarat', address: 'GIDC Vapi', contact: '9876543210' },
  { type: 'Customer', name: 'Super Dies & Moulds', gst: '27AADCS7890L1ZY', state: 'Tamil Nadu', address: 'Coimbatore Industrial Area', contact: '9843011122' },
  { type: 'Customer', name: 'Omega Heat Tech', gst: '27AACCO1122D1ZX', state: 'Maharashtra', address: 'Chakan MIDC, Pune', contact: '9004012345' },
  { type: 'Vendor', name: 'Shree Heat Solutions', gst: '27AABCS4455K1ZQ', state: 'Maharashtra', address: 'Talawade MIDC, Pune', contact: '9011022233' },
  { type: 'Vendor', name: 'Thermo Treat Services', gst: '24AACCT7788L1ZR', state: 'Gujarat', address: 'Ahmedabad Industrial Estate', contact: '9090909090' },
  { type: 'Vendor', name: 'Vacuum Tech Furnaces', gst: '29AACCV8899M1ZS', state: 'Karnataka', address: 'Peenya Industrial Area, Bangalore', contact: '9988776655' },
  { type: 'Vendor', name: 'Metal Heat Processors', gst: '27AACCM5566N1ZT', state: 'Maharashtra', address: 'Aurangabad MIDC', contact: '9123456780' },
  { type: 'Vendor', name: 'Prime Alloy Services', gst: '33AACCP3344P1ZU', state: 'Tamil Nadu', address: 'Hosur SIPCOT Industrial Area', contact: '9876501234' },
  { type: 'Both', name: 'Concept Engineering Pvt Ltd', gst: '27AACCC1122D1ZA', state: 'Maharashtra', address: 'MIDC Bhosari, Pune', contact: '9822001122' },
  { type: 'Both', name: 'Pentagon Steel Solutions', gst: '27AACCP7788K1ZB', state: 'Maharashtra', address: 'Chakan Industrial Area, Pune', contact: '9890012345' },
  { type: 'Both', name: 'Parleon Tooling Systems', gst: '24AACCP5566M1ZC', state: 'Gujarat', address: 'GIDC Vapi', contact: '9876541122' },
  { type: 'Both', name: 'Nissan Engineering Works', gst: '27AACCN3344H1ZD', state: 'Maharashtra', address: 'Talegaon MIDC, Pune', contact: '9765432100' },
  { type: 'Both', name: 'Artur Schade Steel Pvt Ltd', gst: '29AACCA9988J1ZE', state: 'Karnataka', address: 'Peenya Industrial Area, Bangalore', contact: '9988112233' },
];

function partyTypeEnum(t) {
  if (t === 'Customer') return 'CUSTOMER';
  if (t === 'Vendor') return 'VENDOR';
  if (t === 'Both') return 'BOTH';
  throw new Error(`Unknown type: ${t}`);
}

async function main() {
  let inserted = 0;
  let skipped = 0;

  for (const p of PARTIES) {
    const gstin = p.gst.trim();
    const existing = await prisma.party.findFirst({ where: { gstin } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const stateCode = gstin.length >= 2 ? gstin.slice(0, 2) : null;

    await prisma.party.create({
      data: {
        name: p.name.trim(),
        address: p.address.trim(),
        state: p.state.trim(),
        gstin,
        phone: p.contact.trim(),
        partyType: partyTypeEnum(p.type),
        stateCode,
        isActive: true,
      },
    });
    inserted += 1;
  }

  console.log(`Parties: ${inserted} inserted, ${skipped} skipped (GSTIN already present). Total in seed list: ${PARTIES.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
