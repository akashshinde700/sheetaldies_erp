const router = require('express').Router();
const ctrl   = require('../controllers/dev.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.post('/seed-image-data', auth, requireRole('ADMIN'), ctrl.seedImageData);
// Local/dev-only helper endpoint
router.post('/seed-image-data/no-auth', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not allowed in production.' });
  }
  return next();
}, ctrl.seedImageData);
// Check seed data status
router.get('/seed-status', ctrl.checkSeedStatus);

module.exports = router;
