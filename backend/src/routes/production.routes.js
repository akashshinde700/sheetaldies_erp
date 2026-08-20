const router = require('express').Router();
const ctrl   = require('../controllers/production.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Item-level production entries
router.post  ('/',                           auth, requireRole('OPERATOR'), ctrl.create);
router.get   ('/item/:challanItemId',        auth, ctrl.getByItem);
router.get   ('/job-card/:jobCardId',        auth, ctrl.getByJobCard);
router.patch ('/:id',                        auth, requireRole('MANAGER'),  ctrl.updateEntry);
router.delete('/:id',                        auth, requireRole('MANAGER'),  ctrl.deleteEntry);

// Job card weight tracking
router.patch ('/job-card/:jobCardId/weight', auth, requireRole('OPERATOR'), ctrl.updateJobCardWeight);

// Inward weight summary
router.get   ('/inward/:challanId/weight-summary', auth, ctrl.getWeightSummary);

module.exports = router;
