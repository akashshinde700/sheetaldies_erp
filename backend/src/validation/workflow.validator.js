const Joi = require('joi');

const stepSchema = Joi.object({
  stepCode: Joi.string().trim().max(60).required(),
  stepName: Joi.string().trim().max(150).required(),
  stepType: Joi.string().valid('OPERATION', 'INSPECTION', 'DECISION', 'DISPATCH', 'LOOP').default('OPERATION'),
  sequenceNo: Joi.number().integer().min(1).required(),
  isMandatory: Joi.boolean().default(true),
  isRepeatable: Joi.boolean().default(false),
  requiresMachine: Joi.boolean().default(false),
  requiresQc: Joi.boolean().default(false),
  requiresFile: Joi.boolean().default(false),
  allowParallel: Joi.boolean().default(false),
  slaMinutes: Joi.number().integer().min(1).allow(null),
  configJson: Joi.object().unknown(true).allow(null),
});

const transitionSchema = Joi.object({
  fromStepCode: Joi.string().trim().required(),
  toStepCode: Joi.string().trim().required(),
  conditionType: Joi.string()
    .valid('ALWAYS', 'MATERIAL_TYPE_IN', 'QC_PASS', 'QC_FAIL', 'FIELD_EQUALS')
    .default('ALWAYS'),
  conditionExpr: Joi.object().unknown(true).allow(null),
  priority: Joi.number().integer().min(1).default(1),
  isReworkPath: Joi.boolean().default(false),
});

exports.createTemplate = Joi.object({
  code: Joi.string().trim().max(50).required(),
  name: Joi.string().trim().max(150).required(),
  description: Joi.string().allow('', null),
  industry: Joi.string().trim().max(100).allow('', null),
  version: Joi.number().integer().min(1).default(1),
  isDefault: Joi.boolean().default(false),
  steps: Joi.array().items(stepSchema).min(1).required(),
  transitions: Joi.array().items(transitionSchema).default([]),
});

exports.startJobWorkflow = Joi.object({
  templateId: Joi.number().integer().positive().required(),
  remarks: Joi.string().allow('', null),
});

exports.startStep = Joi.object({
  operatorName: Joi.string().trim().max(100).allow('', null),
  machineId: Joi.number().integer().positive().allow(null),
  remarks: Joi.string().allow('', null),
  inputData: Joi.object().unknown(true).allow(null),
});

exports.completeStep = Joi.object({
  qcResult: Joi.string().valid('PENDING', 'PASS', 'FAIL', 'CONDITIONAL').allow(null),
  observations: Joi.string().allow('', null),
  remarks: Joi.string().allow('', null),
  outputData: Joi.object().unknown(true).allow(null),
  attachments: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().required(),
        fileUrl: Joi.string().required(),
        mimeType: Joi.string().allow('', null),
      })
    )
    .allow(null),
});

exports.triggerRework = Joi.object({
  reason: Joi.string().trim().min(3).required(),
  qcResult: Joi.string().valid('FAIL').default('FAIL'),
});

exports.idParam = Joi.object({
  id: Joi.number().integer().positive().required(),
});

exports.jobAndStepParams = Joi.object({
  jobCardId: Joi.number().integer().positive().required(),
  stepId: Joi.number().integer().positive().required(),
});

exports.jobParam = Joi.object({
  jobCardId: Joi.number().integer().positive().required(),
});
