const router = require('express').Router();
const ctrl = require('../controllers/manufacturing.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const runsheetVal = require('../validation/runsheet.validation');

router.use(auth);

// VHT Run Sheets (actual furnace execution record)
router.get('/runsheets', ctrl.listRunsheets);
router.get('/runsheets/:id', validate(runsheetVal.idParamSchema, 'params'), ctrl.getRunsheet);
router.post('/runsheets', requireRole('ADMIN', 'MANAGER'), validate(runsheetVal.createRunsheetSchema), ctrl.createRunsheet);
router.put('/runsheets/:id', requireRole('ADMIN', 'MANAGER'), validate(runsheetVal.idParamSchema, 'params'), validate(runsheetVal.updateRunsheetSchema), ctrl.updateRunsheet);
router.put('/runsheets/:id/status', requireRole('ADMIN', 'MANAGER'), ctrl.updateRunsheetStatus);
router.delete('/runsheets/:id',     requireRole('ADMIN', 'MANAGER'), ctrl.deleteRunsheet);

// Furnace Utilisation Statement (daily, shift-wise)
router.get('/furnace-utilization', ctrl.getFurnaceUtilizationDay);
router.post('/furnace-utilization', requireRole('ADMIN', 'MANAGER'), ctrl.upsertFurnaceUtilizationDay);
router.delete('/furnace-utilization', requireRole('ADMIN', 'MANAGER'), ctrl.deleteFurnaceUtilizationDay);

// Daily Idle Logs (machine-wise, monthly sheet)
router.get('/idle-logs', ctrl.getDailyIdleSheet);
router.post('/idle-logs', requireRole('ADMIN', 'MANAGER'), ctrl.upsertDailyIdleSheet);
router.delete('/idle-logs', requireRole('ADMIN', 'MANAGER'), ctrl.deleteDailyIdleSheet);

// Plant Losses (monthly, all-machine summary)
router.get('/plant-losses', ctrl.getPlantLossMonth);
router.post('/plant-losses', requireRole('ADMIN', 'MANAGER'), ctrl.upsertPlantLossMonth);
router.delete('/plant-losses', requireRole('ADMIN', 'MANAGER'), ctrl.deletePlantLossMonth);
router.post('/plant-losses/derive', requireRole('ADMIN', 'MANAGER'), ctrl.derivePlantLossFromDaily);

// Daily Production Planning (furnace-wise view of the day's run sheets)
router.get('/daily-planning', ctrl.getDailyPlanning);
router.get('/next-cycle-no', ctrl.getNextCycleNo);

// Tempering Furnace Planning (batches hardening run sheets into a temper slot)
router.get('/tempering-slots', ctrl.listTemperingSlots);
router.post('/tempering-slots', requireRole('ADMIN', 'MANAGER'), ctrl.upsertTemperingSlot);
router.delete('/tempering-slots/:id', requireRole('ADMIN', 'MANAGER'), ctrl.deleteTemperingSlot);

// Energy Consumption Register (monthly, per furnace cycle)
router.get('/energy-log', ctrl.listEnergyLog);
router.post('/energy-log', requireRole('ADMIN', 'MANAGER'), ctrl.upsertEnergyLogEntry);
router.delete('/energy-log/:id', requireRole('ADMIN', 'MANAGER'), ctrl.deleteEnergyLogEntry);

module.exports = router;
