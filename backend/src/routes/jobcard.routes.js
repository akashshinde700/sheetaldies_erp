const router = require('express').Router();
const ctrl   = require('../controllers/jobcard.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadFiveImages } = require('../middleware/upload');

router.get   ('/stats', auth, ctrl.stats);
router.get   ('/',      auth, ctrl.list);
router.get   ('/:id',   auth, ctrl.getOne);
router.post  ('/',      auth, requireRole('OPERATOR'), uploadFiveImages('jobcards'), ctrl.create);
router.patch ('/:id/status', auth, requireRole('OPERATOR'), ctrl.patchStatus);
router.post  ('/:id/split',  auth, requireRole('OPERATOR'), ctrl.split);
router.put   ('/:id',   auth, requireRole('OPERATOR'), uploadFiveImages('jobcards'), ctrl.update);

module.exports = router;
