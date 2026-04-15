const router  = require('express').Router();
const ctrl    = require('../controllers/analytics.controller');
const protect = require('../middleware/auth');

router.use(protect);

router.get('/overview',         ctrl.overview);
router.get('/monthly-revenue',  ctrl.monthlyRevenue);
router.get('/monthly-jobs',     ctrl.monthlyJobs);
router.get('/monthly-invoice-breakdown', ctrl.monthlyInvoiceBreakdown);
router.get('/job-status',       ctrl.jobStatusDist);
router.get('/top-customers',    ctrl.topCustomers);
router.get('/process-dist',     ctrl.processDist);
router.get('/quality-trend',    ctrl.qualityTrend);
router.get('/turnaround',       ctrl.turnaround);
router.get('/payment-status',   ctrl.paymentStatus);
router.get('/material-analytics', ctrl.materialAnalytics);
router.get('/pending-reports',  ctrl.pendingReports);
router.get('/pending-items',    ctrl.pendingItems);

module.exports = router;
