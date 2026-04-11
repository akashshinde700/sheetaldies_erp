const router = require('express').Router();
const ctrl = require('../controllers/workflow.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const schema = require('../validation/workflow.validator');

// Template APIs
router.get('/templates', auth, ctrl.listTemplates);
router.post('/templates', auth, requireRole('ADMIN'), validate(schema.createTemplate), ctrl.createTemplate);
router.get('/templates/:id', auth, validate(schema.idParam, 'params'), ctrl.getTemplate);
router.delete('/templates/:id', auth, requireRole('ADMIN'), validate(schema.idParam, 'params'), ctrl.deleteTemplate);
router.post('/templates/seed/vht-standard', auth, requireRole('ADMIN'), ctrl.seedHeatTreatmentTemplate);

// Job Workflow APIs
router.post('/jobs/:jobCardId/start', auth, requireRole('OPERATOR'), validate(schema.jobParam, 'params'), validate(schema.startJobWorkflow), ctrl.startJobWorkflow);
router.post('/jobs/:jobCardId/steps/:stepId/start', auth, requireRole('OPERATOR'), validate(schema.jobAndStepParams, 'params'), validate(schema.startStep), ctrl.startStep);
router.post('/jobs/:jobCardId/steps/:stepId/complete', auth, requireRole('OPERATOR'), validate(schema.jobAndStepParams, 'params'), validate(schema.completeStep), ctrl.completeStep);
router.post('/jobs/:jobCardId/rework', auth, requireRole('OPERATOR'), validate(schema.jobParam, 'params'), validate(schema.triggerRework), ctrl.triggerRework);
router.get('/jobs/:jobCardId/timeline', auth, validate(schema.jobParam, 'params'), ctrl.getTimeline);
router.get('/jobs/:jobCardId/allowed-actions', auth, validate(schema.jobParam, 'params'), ctrl.getAllowedActions);

module.exports = router;
