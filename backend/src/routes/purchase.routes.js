const router = require('express').Router();
const ctrl = require('../controllers/purchase.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const purchaseVal = require('../validation/purchase.validator');

router.use(auth);

// Inventory — must be before /:id to avoid being matched as an ID
router.get('/inventory/list', ctrl.getInventory);
router.get('/inventory/low-stock', ctrl.getLowStock);
router.get('/inventory/movements', ctrl.getInventoryMovements);
router.post('/inventory/upsert', requireRole('ADMIN', 'MANAGER'), validate(purchaseVal.upsertInventorySchema), ctrl.upsertInventory);

// Purchase Orders
router.get('/', ctrl.list);
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(purchaseVal.createPOSchema), ctrl.create);
router.get('/:id', validate(purchaseVal.idParamSchema, 'params'), ctrl.getOne);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), validate(purchaseVal.idParamSchema, 'params'), validate(purchaseVal.updatePOSchema), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), validate(purchaseVal.idParamSchema, 'params'), ctrl.delete);

// GRN (Goods Receipt)
router.post('/:id/grn', requireRole('ADMIN', 'MANAGER'), validate(purchaseVal.idParamSchema, 'params'), validate(purchaseVal.createGRNSchema), ctrl.createGRN);

module.exports = router;
