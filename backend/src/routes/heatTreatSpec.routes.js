const router = require('express').Router();
const ctrl   = require('../controllers/heatTreatSpec.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get   ('/',           auth, ctrl.list);
router.post  ('/',           auth, requireRole('MANAGER'), ctrl.create);
router.put   ('/:id',        auth, requireRole('MANAGER'), ctrl.update);
router.delete('/:id',        auth, requireRole('MANAGER'), ctrl.remove);
router.patch ('/:id/toggle', auth, requireRole('MANAGER'), ctrl.toggle);

module.exports = router;
