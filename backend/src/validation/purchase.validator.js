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

exports.upsertInventorySchema = Joi.object({
  itemId: Joi.number().integer().positive().required(),
  quantityOnHand: Joi.number().integer().min(0).required(),
  reorderLevel: Joi.number().integer().min(0).default(10),
  remarks: Joi.string().max(300).allow('', null),
});

