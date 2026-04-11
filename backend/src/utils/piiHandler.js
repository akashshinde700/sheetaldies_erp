/**
 * PII Handler - Encryption/Decryption for Sensitive Party Information
 * Automatically encrypts/decrypts GSTIN, PAN, Bank details
 */

const { encrypt, decrypt } = require('./encryption');

// Fields that should be encrypted
const PII_FIELDS = ['gstin', 'pan', 'accountNo', 'ifscCode'];

/**
 * Encrypt PII fields in party data before saving
 * ✅ FIXED: Actually USE the encryption utility
 */
const encryptPartyData = (partyData) => {
  if (!partyData) return partyData;

  const encrypted = { ...partyData };
  
  for (const field of PII_FIELDS) {
    if (encrypted[field]) {
      try {
        encrypted[field] = encrypt(encrypted[field]);
      } catch (err) {
        console.error(`Failed to encrypt ${field}:`, err.message);
        // If encryption fails, still save but log error
        encrypted[`${field}__encrypt_failed`] = true;
      }
    }
  }
  
  return encrypted;
};

/**
 * Decrypt PII fields when retrieving party data
 */
const decryptPartyData = (partyData) => {
  if (!partyData) return partyData;

  const decrypted = { ...partyData };
  
  for (const field of PII_FIELDS) {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (err) {
        console.error(`Failed to decrypt ${field}:`, err.message);
        decrypted[field] = '***DECRYPTION_FAILED***';
      }
    }
  }
  
  return decrypted;
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
 * Find party by encrypted field (for lookups)
 * Note: This requires storing a hash of the original value for comparison
 * For now, queries by unencrypted fields should work via name/id
 */
const findPartyByPII = async (prisma, field, value) => {
  // Cannot efficiently search encrypted fields without hash index
  // Use unencrypted unique fields (id, name, email) instead
  if (!['id', 'name', 'email'].includes(field)) {
    throw new Error(`Cannot search by encrypted field '${field}'. Use unique fields like id, name, or email.`);
  }
  
  return await prisma.party.findFirst({
    where: { [field]: value },
  });
};

module.exports = {
  PII_FIELDS,
  encryptPartyData,
  decryptPartyData,
  createEncryptedParty,
  updateEncryptedParty,
  findPartyByPII,
};
