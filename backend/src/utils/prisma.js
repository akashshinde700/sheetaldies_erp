const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./encryption');

const globalForPrisma = globalThis;

// Party PII (gstin, pan, phone, email, bank details) is encrypted at rest by
// encryptPartyData() on every write. Only party.controller.js/party.routes.js
// used to decrypt it back on read — every OTHER place that includes a Party
// relation (invoice.fromParty/toParty, quote.customer, job card customer,
// etc.) got the raw ciphertext straight from Prisma, which is what showed up
// as garbled text instead of a GSTIN on invoice/quote prints. A Prisma result
// extension decrypts these fields for ANY query that returns Party data —
// direct or nested — so every current and future call site is covered
// without having to patch each controller individually.
const PII_FIELDS = ['gstin', 'pan', 'phone', 'email', 'accountNo', 'ifscCode', 'swiftCode', 'bankName', 'bankAccountHolder'];

const safeDecrypt = (value, field) => {
  if (!value) return value;
  try {
    return decrypt(value);
  } catch (err) {
    console.warn(`[DECRYPT_ERROR] Failed to decrypt Party.${field}:`, err.message);
    return `***DECRYPT_ERROR_${field}***`;
  }
};

const partyResultFields = {};
for (const field of PII_FIELDS) {
  partyResultFields[field] = {
    needs: { [field]: true },
    compute(party) { return safeDecrypt(party[field], field); },
  };
}

const basePrisma = globalForPrisma.__prismaBase || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prismaBase = basePrisma;
}

const prisma = globalForPrisma.__prisma || basePrisma.$extends({
  name: 'decrypt-party-pii',
  result: { party: partyResultFields },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
