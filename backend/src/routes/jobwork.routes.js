const router = require('express').Router();
const ctrl   = require('../controllers/jobwork.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get   ('/',               auth, ctrl.list);
router.get   ('/register',       auth, ctrl.register);
router.get   ('/:id',            auth, ctrl.getOne);
router.post  ('/',               auth, requireRole('OPERATOR'), ctrl.create);
router.put   ('/:id',            auth, requireRole('OPERATOR'), ctrl.update);
router.patch ('/:id/status',     auth, requireRole('OPERATOR'), ctrl.updateStatus);

module.exports = router;
