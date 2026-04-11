const router  = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl    = require('../controllers/auth.controller');
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

router.post('/login', loginLimiter, ctrl.login);
router.post('/request-otp',     ctrl.requestOtp);
router.post('/verify-otp',      ctrl.verifyOtp);
router.post('/refresh-token',   ctrl.refreshToken);
router.post('/logout',          ctrl.logout);
router.get ('/me',              auth, ctrl.me);
router.put ('/change-password', auth, ctrl.changePassword);

// Admin only
router.post  ('/users',              auth, requireRole('ADMIN'),   ctrl.createUser);
router.get   ('/users',              auth, requireRole('MANAGER'), ctrl.listUsers);
router.put   ('/users/:id',          auth, requireRole('ADMIN'),   ctrl.updateUser);
router.patch ('/users/:id/toggle',   auth, requireRole('ADMIN'),   ctrl.toggleUser);

module.exports = router;
