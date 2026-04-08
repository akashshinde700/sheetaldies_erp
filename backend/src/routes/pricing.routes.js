const router = require('express').Router();
const ctrl = require('../controllers/pricing.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(auth);

router.get('/process-types', ctrl.getProcessTypes);
router.get('/', ctrl.list);
router.post('/', requireRole('ADMIN', 'MANAGER'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), ctrl.delete);

module.exports = router;
