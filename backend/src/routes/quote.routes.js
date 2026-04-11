const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const ctrl = require('../controllers/quote.controller');

// Quotes are purchasing workflow: Manager+
router.post('/', auth, requireRole('MANAGER'), ctrl.createQuote);
router.get('/', auth, requireRole('MANAGER'), ctrl.getQuotes);
router.get('/:id', auth, requireRole('MANAGER'), ctrl.getQuoteById);
router.put('/:id', auth, requireRole('MANAGER'), ctrl.updateQuote);
router.patch('/:id/status', auth, requireRole('MANAGER'), ctrl.updateQuoteStatus);
router.post('/:id/convert-to-po', auth, requireRole('MANAGER'), ctrl.convertToPurchaseOrder);
router.get('/:id/pdf', auth, requireRole('MANAGER'), ctrl.exportQuotePDF);
router.delete('/:id', auth, requireRole('MANAGER'), ctrl.deleteQuote);

module.exports = router;

