const router = require('express').Router();
const ctrl = require('../controllers/quality.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadFiveImages } = require('../middleware/upload');

// Test Certificates (before /:jobCardId/inspection so paths are unambiguous)
router.get('/certificates', auth, ctrl.listCertificates);
router.get('/certificates/suggested-temp-cycle', auth, ctrl.getSuggestedTempCycleForJobCard);
router.get('/certificates/:id', auth, ctrl.getCertificate);
router.post('/certificates', auth, requireRole('OPERATOR'), uploadFiveImages('certificates'), ctrl.createCertificate);

// Inspections
router.get('/:jobCardId/inspection', auth, ctrl.getInspection);
router.post('/:jobCardId/inspection', auth, requireRole('OPERATOR'), uploadFiveImages('inspections'), ctrl.upsertInspection);
router.put('/:jobCardId/inspection', auth, requireRole('OPERATOR'), uploadFiveImages('inspections'), ctrl.upsertInspection);

module.exports = router;
