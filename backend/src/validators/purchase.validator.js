const Joi = require('joi');

const poLineSchema = Joi.object({
  itemId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).required(),
});

const grnLineSchema = Joi.object({
  itemId: Joi.number().integer().positive().required(),
  quantityReceived: Joi.number().integer().min(0).required(),
  quantityAccepted: Joi.number().integer().min(0).required(),
  quantityRejected: Joi.number().integer().min(0).default(0),
  remarks: Joi.string().max(300).allow('', null),
}).custom((value, helpers) => {
  if ((value.quantityAccepted + value.quantityRejected) > value.quantityReceived) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'GRN qty consistency');

exports.idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

exports.createPOSchema = Joi.object({
  vendorId: Joi.number().integer().positive().required(),
  poDate: Joi.date().allow('', null),
  expectedDelivery: Joi.date().allow('', null),
  remarks: Joi.string().allow('', null),
  items: Joi.array().items(poLineSchema).min(1).required(),
});

exports.updatePOSchema = Joi.object({
  vendorId: Joi.number().integer().positive(),
  poDate: Joi.date().allow('', null),
  expectedDelivery: Joi.date().allow('', null),
  remarks: Joi.string().allow('', null),
  status: Joi.string().valid('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'),
  items: Joi.array().items(poLineSchema).min(1),
}).min(1);

exports.createGRNSchema = Joi.object({
  purchaseOrderId: Joi.number().integer().positive(),
  grnDate: Joi.date().allow('', null),
  remarks: Joi.string().allow('', null),
  items: Joi.array().items(grnLineSchema).min(1).required(),
});

exports.upsertInventorySchema = Joi.object({
  itemId: Joi.number().integer().positive().required(),
  quantityOnHand: Joi.number().integer().min(0).required(),
  reorderLevel: Joi.number().integer().min(0).default(10),
  remarks: Joi.string().max(300).allow('', null),
});

