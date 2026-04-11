const router = require('express').Router();
const ctrl = require('../controllers/dispatch.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const commercialVal = require('../validation/commercial.validator');

// List all dispatch challans
router.get('/', auth, ctrl.list);

// Get single dispatch challan
router.get('/:id', auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getOne);

// Create dispatch challan
router.post('/', auth, requireRole('MANAGER'), validate(commercialVal.createDispatchSchema), ctrl.create);

// Update dispatch challan
router.put('/:id', auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), validate(commercialVal.updateDispatchSchema), ctrl.update);

// Delete dispatch challan
router.delete('/:id', auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.delete);

// Update dispatch status
router.patch('/:id/status', auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), validate(commercialVal.dispatchStatusSchema), ctrl.updateStatus);

module.exports = router;
