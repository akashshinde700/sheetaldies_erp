const router = require('express').Router();
const ctrl = require('../controllers/stock.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(auth);

// Literal paths pehle — warna "/:id" inhe id samajh lega.
router.get('/stats', ctrl.stats);
router.get('/categories', ctrl.categories);
router.get('/movements', ctrl.listMovements);
router.get('/movements/export', ctrl.exportRegister);
router.post('/movements', requireRole('ADMIN', 'MANAGER', 'OPERATOR'), ctrl.move);

router.get('/', ctrl.listItems);
router.post('/', requireRole('ADMIN', 'MANAGER'), ctrl.createItem);
router.get('/:id', ctrl.getItem);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.updateItem);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.deleteItem);

module.exports = router;
