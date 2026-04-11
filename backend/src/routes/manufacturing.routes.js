const router = require('express').Router();
const ctrl = require('../controllers/manufacturing.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const runsheetVal = require('../validation/runsheet.validation');

router.use(auth);

// Manufacturing Batches
router.get('/batches', ctrl.listBatches);
router.post('/batches', requireRole('ADMIN', 'MANAGER'), ctrl.createBatch);

// VHT Run Sheets (actual furnace execution record)
router.get('/runsheets', ctrl.listRunsheets);
router.get('/runsheets/:id', validate(runsheetVal.idParamSchema, 'params'), ctrl.getRunsheet);
router.post('/runsheets', requireRole('ADMIN', 'MANAGER'), validate(runsheetVal.createRunsheetSchema), ctrl.createRunsheet);
router.put('/runsheets/:id', requireRole('ADMIN', 'MANAGER'), validate(runsheetVal.idParamSchema, 'params'), validate(runsheetVal.updateRunsheetSchema), ctrl.updateRunsheet);
router.put('/runsheets/:id/status', requireRole('ADMIN', 'MANAGER'), ctrl.updateRunsheetStatus);

// Production Planning
router.post('/production-plan', requireRole('ADMIN', 'MANAGER'), ctrl.createProductionPlan);

// Reports
router.get('/reports/machine-utilization', ctrl.getMachineUtilization);
router.get('/reports/idle-time', ctrl.getIdleTimeReport);
router.get('/reports/shift-wise', ctrl.getShiftReport);
router.get('/reports/batch/:batchId', ctrl.getBatchReport);
router.get('/reports/plant-losses', ctrl.getPlantLossMonth);
router.post('/reports/plant-losses', requireRole('ADMIN', 'MANAGER'), ctrl.upsertPlantLossMonth);
router.get('/reports/daily-idle', ctrl.getDailyIdleSheet);
router.post('/reports/daily-idle', requireRole('ADMIN', 'MANAGER'), ctrl.upsertDailyIdleSheet);
router.post('/reports/plant-losses/derive', requireRole('ADMIN', 'MANAGER'), ctrl.derivePlantLossFromDaily);
router.get('/reports/furnace-utilisation', ctrl.getFurnaceUtilizationDay);
router.post('/reports/furnace-utilisation', requireRole('ADMIN', 'MANAGER'), ctrl.upsertFurnaceUtilizationDay);

module.exports = router;
