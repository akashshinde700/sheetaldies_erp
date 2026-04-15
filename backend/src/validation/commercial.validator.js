const Joi = require('joi');

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const challanIdParamSchema = Joi.object({
  challanId: Joi.number().integer().positive().required(),
});

const dispatchItemSchema = Joi.object({
  itemId: Joi.number().integer().positive().required(),
  sourceChallanItemId: Joi.number().integer().positive().allow(null, ''),
  description: Joi.string().allow('', null),
  quantity: Joi.number().integer().min(1).required(),
  weightKg: Joi.number().min(0).allow(null),
  remarks: Joi.string().max(300).allow('', null),
});

exports.createDispatchSchema = Joi.object({
  challanDate: Joi.date().allow('', null),
  fromPartyId: Joi.number().integer().positive().required(),
  toPartyId: Joi.number().integer().positive().required(),
  jobworkChallanId: Joi.number().integer().positive().allow(null, ''),
  dispatchMode: Joi.string().allow('', null),
  vehicleNo: Joi.string().allow('', null),
  remarks: Joi.string().allow('', null),
  status: Joi.string().valid('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'),
  items: Joi.array().items(dispatchItemSchema).default([]),
});

exports.updateDispatchSchema = Joi.object({
  challanDate: Joi.date().allow('', null),
  fromPartyId: Joi.number().integer().positive(),
  toPartyId: Joi.number().integer().positive(),
  jobworkChallanId: Joi.number().integer().positive().allow(null, ''),
  dispatchMode: Joi.string().allow('', null),
  vehicleNo: Joi.string().allow('', null),
  remarks: Joi.string().allow('', null),
  status: Joi.string().valid('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED'),
  items: Joi.array().items(dispatchItemSchema),
}).min(1);

exports.dispatchStatusSchema = Joi.object({
  status: Joi.string().valid('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED', 'CANCELLED').required(),
});

const invoiceItemSchema = Joi.object({
  description: Joi.string().required(),
  material: Joi.string().allow('', null),
  hrc: Joi.string().allow('', null),
  woNo: Joi.string().allow('', null),
  hsnSac: Joi.string().allow('', null),
  sourceChallanItemId: Joi.number().integer().positive().allow(null, ''),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().allow('', null),
  weight: Joi.number().min(0).allow(null),
  rate: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required(),
  processTypeId: Joi.number().integer().positive().allow(null, ''),
});

exports.createInvoiceSchema = Joi.object({
  invoiceDate: Joi.date().allow('', null),
  dispatchDate: Joi.date().allow('', null),
  fromPartyId: Joi.number().integer().positive().required(),
  toPartyId: Joi.number().integer().positive().required(),
  challanId: Joi.number().integer().positive().allow(null, ''),
  challanRef: Joi.string().allow('', null),
  poRef: Joi.string().allow('', null),
  jobCardRef: Joi.string().allow('', null),
  otherReferences: Joi.string().allow('', null),
  cgstRate: Joi.number().min(0).allow(null),
  sgstRate: Joi.number().min(0).allow(null),
  igstRate: Joi.number().min(0).allow(null),
  transportFreight: Joi.number().min(0).allow(null),
  tcsRate: Joi.number().min(0).allow(null),
  extraAmt: Joi.number().allow(null),
  dispatchDocNo: Joi.string().allow('', null),
  eWayBillNo: Joi.string().allow('', null),
  items: Joi.array().items(invoiceItemSchema).min(1).required(),
});

exports.updateInvoicePaymentSchema = Joi.object({
  paymentStatus: Joi.string().valid('PENDING', 'PARTIAL', 'PAID').required(),
  paidDate: Joi.date().allow('', null),
  paymentRef: Joi.string().allow('', null),
});

const jobworkItemSchema = Joi.object({
  itemId: Joi.number().integer().positive().allow(null, ''),
  description: Joi.string().allow('', null),
  drawingNo: Joi.string().allow('', null),
  material: Joi.string().allow('', null),
  hrc: Joi.string().allow('', null),
  woNo: Joi.string().allow('', null),
  hsnCode: Joi.string().allow('', null),
  sacNo: Joi.string().allow('', null),
  processTypeId: Joi.number().integer().positive().allow(null, ''),
  processName: Joi.string().allow('', null),
  partName: Joi.string().allow('', null),
  quantity: Joi.number().positive().required(),
  qtyOut: Joi.number().min(0).allow(null),
  uom: Joi.string().allow('', null),
  weight: Joi.number().min(0).allow(null),
  rate: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required(),
});

exports.createJobworkSchema = Joi.object({
  challanDate: Joi.date().allow('', null),
  fromPartyId: Joi.number().integer().positive().required(),
  toPartyId: Joi.number().integer().positive().required(),
  manualChallanNo: Joi.string().allow('', null),
  receivedDate: Joi.date().allow('', null),
  jobCardId: Joi.number().integer().positive().allow(null, ''),
  jobCardNo: Joi.string().allow('', null),
  jobCardDate: Joi.date().allow('', null),
  invoiceChNo: Joi.string().allow('', null),
  invoiceChDate: Joi.date().allow('', null),
  transportMode: Joi.string().allow('', null),
  vehicleNo: Joi.string().allow('', null),
  deliveryPerson: Joi.string().allow('', null),
  dispatchDate: Joi.date().allow('', null),
  dueDate: Joi.date().allow('', null),
  processingNotes: Joi.string().allow('', null),
  handlingCharges: Joi.number().min(0).allow(null),
  cgstRate: Joi.number().min(0).allow(null),
  sgstRate: Joi.number().min(0).allow(null),
  igstRate: Joi.number().min(0).allow(null),
  items: Joi.array().items(jobworkItemSchema).min(1).required(),
});

exports.updateJobworkSchema = Joi.object({
  challanDate: Joi.date().allow('', null),
  jobCardId: Joi.number().integer().positive().allow(null, ''),
  fromPartyId: Joi.number().integer().positive().allow(''),
  toPartyId: Joi.number().integer().positive().allow(''),
  invoiceChNo: Joi.string().allow('', null),
  invoiceChDate: Joi.date().allow('', null),
  transportMode: Joi.string().allow('', null),
  vehicleNo: Joi.string().allow('', null),
  deliveryPerson: Joi.string().allow('', null),
  dispatchDate: Joi.date().allow('', null),
  dueDate: Joi.date().allow('', null),
  processingNotes: Joi.string().allow('', null),
  handlingCharges: Joi.number().min(0).allow(null),
  cgstRate: Joi.number().min(0).allow(null),
  sgstRate: Joi.number().min(0).allow(null),
  igstRate: Joi.number().min(0).allow(null),
  items: Joi.array().items(jobworkItemSchema).min(1).required(),
});

exports.idParamSchema = idParamSchema;
exports.challanIdParamSchema = challanIdParamSchema;

