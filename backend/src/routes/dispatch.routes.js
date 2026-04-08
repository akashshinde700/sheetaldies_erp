const router = require('express').Router();
const ctrl = require('../controllers/dispatch.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// List all dispatch challans
router.get('/', auth, ctrl.list);

// Get single dispatch challan
router.get('/:id', auth, ctrl.getOne);

// Create dispatch challan
router.post('/', auth, requireRole('MANAGER'), ctrl.create);

// Update dispatch challan
router.put('/:id', auth, requireRole('MANAGER'), ctrl.update);

// Delete dispatch challan
router.delete('/:id', auth, requireRole('MANAGER'), ctrl.delete);

// Update dispatch status
router.patch('/:id/status', auth, requireRole('MANAGER'), ctrl.updateStatus);

module.exports = router;
