const Joi = require('joi');

const JOB_CARD_STATUSES = [
  'CREATED',
  'IN_PROGRESS',
  'SENT_FOR_JOBWORK',
  'INSPECTION',
  'COMPLETED',
  'ON_HOLD',
];

const JOBWORK_STATUSES = ['DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];

// Custom validation messages
const messages = {
  'string.min': "'{#label}' must be at least {#limit} characters",
  'string.max': "'{#label}' cannot exceed {#limit} characters",
  'string.email': "'{#label}' must be a valid email",
  'number.min': "'{#label}' must be at least {#limit}",
  'number.max': "'{#label}' cannot exceed {#limit}",
  'any.required': "'{#label}' is required",
};

// Regex validators
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{3}[0-9]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const phoneRegex = /^[6-9]\d{9}$/;
const bankAccountRegex = /^[0-9]{9,18}$/;

// Common field validators
const commonValidations = {
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(100)
    .required()
    .messages(messages),

  password: Joi.string()
    .min(8)
    .max(50)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      ...messages,
      'string.pattern.base': 'Password must contain at least one uppercase letter, lowercase letter, and number',
    }),

  gstin: Joi.string()
    .pattern(gstinRegex)
    .required()
    .messages({
      ...messages,
      'string.pattern.base': 'GSTIN must be valid (15 character format)',
    }),

  pan: Joi.string()
    .pattern(panRegex)
    .required()
    .messages({
      ...messages,
      'string.pattern.base': 'PAN must be valid (10 character format)',
    }),

  phone: Joi.string()
    .pattern(phoneRegex)
    .required()
    .messages({
      ...messages,
      'string.pattern.base': 'Phone must be a valid Indian mobile number (10 digits)',
    }),

  amount: Joi.number()
    .precision(2)
    .positive()
    .max(999999999.99)
    .required()
    .messages(messages),
};

// AUTH Schemas
const authSchemas = {
  login: Joi.object({
    email: commonValidations.email,
    password: Joi.string().required().messages(messages),
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string().required().messages(messages),
    newPassword: commonValidations.password,
  }),

  sendOtp: Joi.object({
    email: commonValidations.email,
  }),

  verifyOtp: Joi.object({
    email: commonValidations.email,
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages(messages),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages(messages),
  }),
};

// PARTY Schemas
const partySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required().messages(messages),
    type: Joi.string().valid('customer', 'vendor', 'jobworker', 'supplier').required().messages(messages),
    email: commonValidations.email,
    phone: commonValidations.phone,
    gstin: commonValidations.gstin,
    pan: commonValidations.pan,
    bankAccountNumber: Joi.string().pattern(bankAccountRegex).messages(messages),
    address: Joi.string().max(500).messages(messages),
    city: Joi.string().max(50).messages(messages),
    state: Joi.string().max(50).messages(messages),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).messages(messages),
    email: commonValidations.email,
    phone: commonValidations.phone,
    address: Joi.string().max(500).messages(messages),
    city: Joi.string().max(50).messages(messages),
    state: Joi.string().max(50).messages(messages),
  }).min(1),
};

// INVOICE Schemas
const invoiceSchemas = {
  create: Joi.object({
    partyId: Joi.number().positive().required().messages(messages),
    invoiceNumber: Joi.string().max(50).required().messages(messages),
    invoiceDate: Joi.date().iso().required().messages(messages),
    dueDate: Joi.date().iso().required().messages(messages),
    amount: commonValidations.amount,
    gstRate: Joi.number().min(0).max(100).precision(2).messages(messages),
    items: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.number().positive().required().messages(messages),
          quantity: Joi.number().positive().required().messages(messages),
          rate: Joi.number().positive().precision(2).required().messages(messages),
        })
      )
      .min(1)
      .required()
      .messages({ ...messages, 'array.min': 'At least one invoice item is required' }),
  }),

  update: Joi.object({
    dueDate: Joi.date().iso().messages(messages),
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue').messages(messages),
  }).min(1),
};

exports.JOB_CARD_STATUSES = JOB_CARD_STATUSES;
exports.JOBWORK_STATUSES = JOBWORK_STATUSES;
exports.jobCardStatusBody = Joi.object({
  status: Joi.string().valid(...JOB_CARD_STATUSES).required(),
});

exports.jobworkStatusBody = Joi.object({
  status: Joi.string().valid(...JOBWORK_STATUSES).required(),
  receivedDate: Joi.alternatives().try(Joi.string(), Joi.date()).optional().allow(null, ''),
  natureOfProcess: Joi.string().allow('', null).optional(),
  qtyReturned: Joi.number().integer().optional().allow(null),
  reworkQty: Joi.number().integer().optional().allow(null),
  scrapQtyKg: Joi.number().optional().allow(null),
  scrapDetails: Joi.string().allow('', null).optional(),
});

// Export all schemas
exports.authSchemas = authSchemas;
exports.partySchemas = partySchemas;
exports.invoiceSchemas = invoiceSchemas;
exports.commonValidations = commonValidations;
exports.messages = messages;
