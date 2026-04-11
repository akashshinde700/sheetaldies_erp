/**
 * Safe JSON parsing helpers for request payloads.
 * Some clients send JSON fields as strings (multipart/form-data).
 */
function parseJsonIfString(value, { fieldName = 'value', defaultValue = null } = {}) {
  if (value == null || value === '') return defaultValue;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    const err = new Error(`Invalid JSON in field '${fieldName}'`);
    err.code = 'INVALID_JSON';
    err.field = fieldName;
    throw err;
  }
}

module.exports = { parseJsonIfString };

