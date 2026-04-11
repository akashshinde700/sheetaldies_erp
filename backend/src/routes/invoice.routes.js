const router = require('express').Router();
const ctrl   = require('../controllers/invoice.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const commercialVal = require('../validation/commercial.validator');

router.get   ('/',                        auth, ctrl.list);
router.get   ('/export/:format',          auth, ctrl.exportInvoices);       // Export invoices (pdf/xlsx) — must be before /:id
router.get   ('/challan/:challanId/billing-status', auth, validate(commercialVal.challanIdParamSchema, 'params'), ctrl.getChallanBillingStatus);
router.get   ('/:id',                     auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getOne);
router.get   ('/:id/tally-xml',           auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getTallyXml);          // Option B: download XML
router.post  ('/',                        auth, requireRole('MANAGER'), validate(commercialVal.createInvoiceSchema), ctrl.create);
router.patch ('/:id/payment',             auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), validate(commercialVal.updateInvoicePaymentSchema), ctrl.updatePayment);
router.post  ('/:id/notify',              auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.sendNotification);  // New: email/sms/whatsapp notification
router.post  ('/:id/send-to-tally',       auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.sendToTally);      // Option A: push to Tally
router.post  ('/:id/mark-sent-to-tally',  auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.markSentToTally);  // Option B: lock after manual import

module.exports = router;
