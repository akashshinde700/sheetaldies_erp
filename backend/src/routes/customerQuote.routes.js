const router = require('express').Router();
const ctrl   = require('../controllers/customerQuote.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get   ('/',          auth, ctrl.list);
router.get   ('/:id',       auth, ctrl.getOne);
router.post  ('/',          auth, requireRole('OPERATOR'), ctrl.create);
router.put   ('/:id',       auth, requireRole('OPERATOR'), ctrl.update);
router.patch ('/:id/status',auth, requireRole('OPERATOR'), ctrl.patchStatus);
router.delete('/:id',       auth, requireRole('MANAGER'),  ctrl.remove);

module.exports = router;
