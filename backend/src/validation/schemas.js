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
