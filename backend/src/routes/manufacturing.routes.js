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

module.exports = router;
