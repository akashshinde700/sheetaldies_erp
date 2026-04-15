const router = require('express').Router();
const ctrl = require('../controllers/audit.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(auth);
// ✅ FIXED: Only ADMIN can view sensitive audit logs (compliance requirement)
router.use(requireRole('ADMIN'));

router.get('/', ctrl.list);
router.get('/dashboard', ctrl.getDashboard);
router.get('/export', ctrl.export);
router.get('/user/:userId', ctrl.getUserActivity);
router.get('/:resource/:resourceId', ctrl.getResourceHistory);

module.exports = router;
