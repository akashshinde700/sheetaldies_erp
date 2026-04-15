/**
 * EXTENDED PII Handler - Complete Encryption for ALL Sensitive Fields
 * ✅ CRITICAL FIX C3: Now encrypts ALL sensitive data including phone, email, bank details
 * 
 * Fields encrypted:
 * - GSTIN, PAN (was already encrypted)
 * - Phone, Email (NEW)
 * - Bank account details: accountNo, ifscCode, swiftCode, bankName, bankAccountHolder (NEW)
 */

const { encrypt, decrypt } = require('./encryption');

// ALL fields that should be encrypted - EXTENDED LIST
const PII_FIELDS = [
  // Identity
  'gstin',
  'pan',
  
  // Contact (NEW)
  'phone',
  'email',
  
  // Banking (NEW)
  'accountNo',
  'ifscCode',
  'swiftCode',
  'bankName',
  'bankAccountHolder'
];

/**
 * Encrypt ALL PII fields in party data before saving
 * ✅ NOW INCLUDES: phone, email, bank details
 */
const encryptPartyData = (partyData) => {
  if (!partyData) return partyData;

  const encrypted = { ...partyData };
  
  for (const field of PII_FIELDS) {
    if (encrypted[field]) {
      try {
        encrypted[field] = encrypt(encrypted[field]);
        console.log(`[ENCRYPT] ${field} encrypted successfully`);
      } catch (err) {
        console.error(`[ENCRYPT_ERROR] Failed to encrypt ${field}:`, err.message);
        encrypted[`${field}__encrypt_failed`] = true;
        throw new Error(`Encryption failed for ${field}`);
      }
    }
  }
  
  return encrypted;
};

/**
 * Decrypt ALL PII fields when retrieving party data
 */
const decryptPartyData = (partyData) => {
  if (!partyData) return partyData;

  const decrypted = { ...partyData };
  
  for (const field of PII_FIELDS) {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (err) {
        console.warn(`[DECRYPT_ERROR] Failed to decrypt ${field}:`, err.message);
        decrypted[field] = `***DECRYPT_ERROR_${field}***`;
      }
    }
  }
  
  return decrypted;
};

/**
 * Mask sensitive fields for display
 * Shows only last 4 digits of sensitive numeric fields
 * 
 * @param {Object} partyData - Party data (should be decrypted first)
 * @returns {Object} - Data with masked sensitive fields
 */
const maskSensitiveFields = (partyData) => {
  if (!partyData) return partyData;

  const masked = { ...partyData };

  // Mask phone: +91-XXXX-XXXX-9876
  if (masked.phone) {
    masked.phone_masked = masked.phone.slice(-4).padStart(masked.phone.length, '*');
  }

  // Mask bank account: XXXX-XXXX-XXXX-9876
  if (masked.accountNo) {
    masked.accountNo_masked = masked.accountNo.slice(-4).padStart(masked.accountNo.length, '*');
  }

  // Mask IFSC: HDFC-****
  if (masked.ifscCode) {
    masked.ifscCode_masked = masked.ifscCode.slice(0, 4) + '-****';
  }

  // Email: j***@example.com
  if (masked.email) {
    const [name, domain] = masked.email.split('@');
    masked.email_masked = name.charAt(0) + '***@' + domain;
  }

  // PAN: XXXXX-XXXX-X (show only last char)
  if (masked.pan) {
    masked.pan_masked = 'XXXXX-XXXX-' + masked.pan.slice(-1);
  }

  return masked;
};

/**
 * Create party with encrypted PII
 */
const createEncryptedParty = async (prisma, partyData) => {
  const encrypted = encryptPartyData(partyData);
  return await prisma.party.create({ data: encrypted });
};

/**
 * Update party with encrypted PII
 */
const updateEncryptedParty = async (prisma, partyId, updates) => {
  const encrypted = encryptPartyData(updates);
  return await prisma.party.update({
    where: { id: partyId },
    data: encrypted,
  });
};

/**
 * Retrieve and decrypt party data
 */
const getDecryptedParty = async (prisma, partyId) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId }
  });

  if (!party) return null;
  return decryptPartyData(party);
};

/**
 * Retrieve multiple parties with decryption
 */
const getDecryptedParties = async (prisma, where = {}, skip = 0, take = 20) => {
  const parties = await prisma.party.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });

  return parties.map(p => decryptPartyData(p));
};

module.exports = {
  encryptPartyData,
  decryptPartyData,
  maskSensitiveFields,
  createEncryptedParty,
  updateEncryptedParty,
  getDecryptedParty,
  getDecryptedParties,
  PII_FIELDS
};
