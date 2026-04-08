const router = require('express').Router();
const ctrl   = require('../controllers/process.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get   ('/',          auth, ctrl.list);
router.get   ('/:id',       auth, ctrl.getOne);
router.post  ('/',          auth, requireRole('ADMIN'), ctrl.create);
router.put   ('/:id',       auth, requireRole('ADMIN'), ctrl.update);
router.patch ('/:id/toggle',auth, requireRole('ADMIN'), ctrl.toggle);

module.exports = router;
