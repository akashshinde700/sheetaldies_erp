const Joi = require('joi');

const graphPointSchema = Joi.object({
  tempC: Joi.number().required(),
  holdMin: Joi.number().min(0).required(),
  label: Joi.string().max(80).allow('', null),
});

const lineSchema = Joi.object({
  jobCardId: Joi.number().integer().positive().allow(null),
  itemId: Joi.number().integer().positive().allow(null),
  quantity: Joi.number().integer().min(1).required(),
  weightKg: Joi.number().min(0).allow(null),
  plannedSlot: Joi.string().max(30).allow('', null),
  customerName: Joi.string().max(200).allow('', null),
  jobDescription: Joi.string().max(300).allow('', null),
  materialGrade: Joi.string().max(100).allow('', null),
  hrcRequired: Joi.string().max(50).allow('', null),
}).or('jobCardId', 'itemId');

const baseRunsheetSchema = {
  batchId: Joi.number().integer().positive().allow(null),
  furnaceId: Joi.number().integer().positive().required(),
  runDate: Joi.date().required(),
  cycleEndTime: Joi.string().max(10).allow('', null),
  totalTimeDisplay: Joi.string().max(20).allow('', null),
  mrStart: Joi.number().integer().allow(null),
  mrEnd: Joi.number().integer().allow(null),
  totalMr: Joi.number().integer().allow(null),
  loadingOperatorName: Joi.string().max(100).allow('', null),
  docRevNo: Joi.string().max(20).allow('', null),
  docEffectiveDate: Joi.date().allow(null),
  docPageOf: Joi.string().max(20).allow('', null),
  tempProfile: Joi.string().max(200).allow('', null),
  cycleTime: Joi.number().integer().min(1).allow(null),
  hardeningType: Joi.string().max(200).allow('', null),
  quenchPressureBar: Joi.number().min(0).allow(null),
  fanRpm: Joi.number().integer().min(0).allow(null),
  fixturesPosition: Joi.string().max(120).allow('', null),
  tempGraphPoints: Joi.array().items(graphPointSchema).allow(null),
  operatorSign: Joi.string().max(150).allow('', null),
  supervisorSign: Joi.string().max(150).allow('', null),
  supervisorVerifiedAt: Joi.date().allow(null),
  verificationNote: Joi.string().allow('', null),
  status: Joi.string().valid('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
  actualOutput: Joi.number().integer().min(0).allow(null),
  remarks: Joi.string().allow('', null),
  items: Joi.array().items(lineSchema).min(1).required(),
};

exports.createRunsheetSchema = Joi.object(baseRunsheetSchema);

exports.updateRunsheetSchema = Joi.object(baseRunsheetSchema);

exports.listRunsheetQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  furnaceId: Joi.number().integer().positive().allow(''),
  status: Joi.string().valid('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', '').allow(null),
  from: Joi.date().allow('', null),
  to: Joi.date().allow('', null),
});

exports.idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});
