/**
 * Encryption/Decryption Utility for Sensitive Fields
 * Uses crypto module with AES-256 encryption
 */

const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || null;
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

const getKeyBuffer = () => {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required for encryption operations');
  }
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }
  return keyBuffer;
};

/**
 * Encrypt a value
 * @param {string} value - The value to encrypt
 * @returns {string} - Encrypted value in format: iv:encryptedData (hex)
 */
const encrypt = (value) => {
  if (!value) return null;

  try {
    const keyBuffer = getKeyBuffer();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (IV needed for decryption)
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Failed to encrypt sensitive data');
  }
};

/**
 * Decrypt a value
 * @param {string} encryptedValue - The encrypted value in format: iv:encryptedData
 * @returns {string} - Decrypted value
 */
const decrypt = (encryptedValue) => {
  if (!encryptedValue) return null;

  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }

    const keyBuffer = getKeyBuffer();
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('Failed to decrypt sensitive data');
  }
};

/**
 * Hash a value (one-way, for checksums)
 * @param {string} value - The value to hash
 * @returns {string} - SHA256 hash
 */
const hash = (value) => {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value)).digest('hex');
};

/**
 * Fields that should be encrypted in the database
 */
const SENSITIVE_FIELDS = {
  // Party model
  'party.gstin': true,
  'party.pan': true,
  'party.accountNo': true,
  
  // User model (optional, passwords are already hashed)
  // 'user.phone': true,
  
  // Invoice model
};

/**
 * Check if a field should be encrypted
 */
const isSensitiveField = (model, field) => {
  return SENSITIVE_FIELDS[`${model}.${field}`] === true;
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  SENSITIVE_FIELDS,
  isSensitiveField,
  ENCRYPTION_KEY,
  ENCRYPTION_ALGORITHM,
};
