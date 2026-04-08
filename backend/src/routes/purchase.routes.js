const router = require('express').Router();
const ctrl = require('../controllers/purchase.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(auth);

// Inventory — must be before /:id to avoid being matched as an ID
router.get('/inventory/list', ctrl.getInventory);
router.get('/inventory/low-stock', ctrl.getLowStock);

// Purchase Orders
router.get('/', ctrl.list);
router.post('/', requireRole('ADMIN', 'MANAGER'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.delete);

// GRN (Goods Receipt)
router.post('/:id/grn', requireRole('ADMIN', 'MANAGER'), ctrl.createGRN);

module.exports = router;
