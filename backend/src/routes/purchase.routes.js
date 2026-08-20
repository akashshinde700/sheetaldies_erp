const router = require('express').Router();
const ctrl = require('../controllers/purchase.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const purchaseVal = require('../validation/purchase.validator');

router.use(auth);

// Inventory. Keep these above any '/:id' route so a literal path segment is
// never swallowed as an id.
router.get('/inventory/list', ctrl.getInventory);
router.get('/inventory/low-stock', ctrl.getLowStock);
router.get('/inventory/movements', ctrl.getInventoryMovements);
router.post('/inventory/upsert', requireRole('ADMIN', 'MANAGER'), validate(purchaseVal.upsertInventorySchema), ctrl.upsertInventory);

module.exports = router;
