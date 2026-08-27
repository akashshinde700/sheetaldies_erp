const router = require('express').Router();
const multer = require('multer');
const ctrl   = require('../controllers/invoice.controller');
const einv   = require('../controllers/einvoice.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const commercialVal = require('../validation/commercial.validator');

// Portal se aayi result Excel sirf padhni hai, disk par rakhni nahi —
// isliye memory storage.
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname || '');
    cb(ok ? null : new Error('Sirf .xlsx ya .xls file chalegi.'), ok);
  },
});

router.get   ('/',                        auth, ctrl.list);
router.get   ('/series',                  auth, ctrl.listSeries);
router.post  ('/series',                  auth, requireRole('MANAGER'), ctrl.createSeries);
router.patch ('/series/:id',              auth, requireRole('MANAGER'), ctrl.updateSeries);
router.get   ('/export/:format',          auth, ctrl.exportInvoices);       // Export invoices (pdf/xlsx) — must be before /:id

// ── GST e-Invoice (IRP / NIC) ──
// Bulk import /:id se pehle rehna chahiye, warna "einvoice-import" ko id samjha jayega.
router.post  ('/einvoice-import',         auth, requireRole('MANAGER'), excelUpload.single('file'), einv.importEInvoiceExcel);
router.get   ('/:id/einvoice-check',      auth, validate(commercialVal.idParamSchema, 'params'), einv.checkEInvoiceReady);
router.get   ('/:id/einvoice-json',       auth, validate(commercialVal.idParamSchema, 'params'), einv.getEInvoiceJson);
router.get   ('/challan/:challanId/billing-status', auth, validate(commercialVal.challanIdParamSchema, 'params'), ctrl.getChallanBillingStatus);
router.get   ('/:id',                     auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getOne);
router.get   ('/:id/tally-xml',           auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getTallyXml);          // Option B: download XML
router.get   ('/:id/tally-json',          auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getTallyJson);         // same voucher as JSON
router.get   ('/:id/tally-excel',         auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getTallyExcel);        // same voucher as Excel
router.post  ('/',                        auth, requireRole('MANAGER'), validate(commercialVal.createInvoiceSchema), ctrl.create);
// Invoice edit sirf ADMIN ke liye — number aur lock waale niyam controller me.
router.put   ('/:id',                     auth, requireRole('ADMIN'), validate(commercialVal.idParamSchema, 'params'), ctrl.update);
router.post  ('/:id/register-print',      auth, validate(commercialVal.idParamSchema, 'params'), ctrl.registerPrint);
router.patch ('/:id/einvoice',            auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.updateEInvoiceDetails);
router.patch ('/:id/payment',             auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), validate(commercialVal.updateInvoicePaymentSchema), ctrl.updatePayment);
router.delete('/:id',                     auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.remove);
router.post  ('/:id/notify',              auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.sendNotification);  // New: email/sms/whatsapp notification
router.post  ('/:id/send-to-tally',       auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.sendToTally);      // Option A: push to Tally
router.post  ('/:id/mark-sent-to-tally',  auth, requireRole('MANAGER'), validate(commercialVal.idParamSchema, 'params'), ctrl.markSentToTally);  // Option B: lock after manual import

module.exports = router;
