const router = require('express').Router();
const ctrl   = require('../controllers/invoice.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get   ('/',                        auth, ctrl.list);
router.get   ('/export/:format',          auth, ctrl.exportInvoices);       // Export invoices (pdf/xlsx) — must be before /:id
router.get   ('/challan/:challanId/billing-status', auth, ctrl.getChallanBillingStatus);
router.get   ('/:id',                     auth, ctrl.getOne);
router.get   ('/:id/tally-xml',           auth, ctrl.getTallyXml);          // Option B: download XML
router.post  ('/',                        auth, requireRole('MANAGER'), ctrl.create);
router.patch ('/:id/payment',             auth, requireRole('MANAGER'), ctrl.updatePayment);
router.post  ('/:id/notify',              auth, requireRole('MANAGER'), ctrl.sendNotification);  // New: email/sms/whatsapp notification
router.post  ('/:id/send-to-tally',       auth, requireRole('MANAGER'), ctrl.sendToTally);      // Option A: push to Tally
router.post  ('/:id/mark-sent-to-tally',  auth, requireRole('MANAGER'), ctrl.markSentToTally);  // Option B: lock after manual import

module.exports = router;
