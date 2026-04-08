const router  = require('express').Router();
const ctrl    = require('../controllers/auth.controller');
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.post('/login',           ctrl.login);
router.post('/request-otp',     ctrl.requestOtp);
router.post('/verify-otp',      ctrl.verifyOtp);
router.get ('/me',              auth, ctrl.me);
router.put ('/change-password', auth, ctrl.changePassword);

// Admin only
router.post  ('/users',              auth, requireRole('ADMIN'),   ctrl.createUser);
router.get   ('/users',              auth, requireRole('MANAGER'), ctrl.listUsers);
router.put   ('/users/:id',          auth, requireRole('ADMIN'),   ctrl.updateUser);
router.patch ('/users/:id/toggle',   auth, requireRole('ADMIN'),   ctrl.toggleUser);

module.exports = router;
