const router = require('express').Router();
const ctrl = require('../controllers/quality.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadFiveImages } = require('../middleware/upload');

// Test Certificates (before /:jobCardId/inspection so paths are unambiguous)
router.get('/certificates', auth, ctrl.listCertificates);
router.get('/certificates/suggested-temp-cycle', auth, ctrl.getSuggestedTempCycleForJobCard);
router.get('/certificates/pending-cert-items/:jobCardId', auth, ctrl.getPendingCertItems);
router.get('/certificates/:id', auth, ctrl.getCertificate);
router.post('/certificates', auth, requireRole('OPERATOR'), uploadFiveImages('certificates'), ctrl.createCertificate);
router.put('/certificates/:id', auth, requireRole('OPERATOR'), uploadFiveImages('certificates'), ctrl.updateCertificate);
router.delete('/certificates/:id', auth, requireRole('MANAGER'), ctrl.deleteCertificate);

// Temperature Cycle Graphs — reusable master shared by Certificates & VHT Run Sheets
router.get('/temp-cycle-templates', auth, ctrl.listTempCycleTemplates);
router.get('/temp-cycle-templates/default', auth, ctrl.getDefaultTempCycleTemplate);
router.get('/temp-cycle-templates/:id', auth, ctrl.getTempCycleTemplate);
router.post('/temp-cycle-templates', auth, requireRole('OPERATOR'), ctrl.createTempCycleTemplate);
router.put('/temp-cycle-templates/:id', auth, requireRole('OPERATOR'), ctrl.updateTempCycleTemplate);
router.post('/temp-cycle-templates/:id/duplicate', auth, requireRole('OPERATOR'), ctrl.duplicateTempCycleTemplate);
router.patch('/temp-cycle-templates/:id/set-default', auth, requireRole('OPERATOR'), ctrl.setDefaultTempCycleTemplate);
router.delete('/temp-cycle-templates/:id', auth, requireRole('MANAGER'), ctrl.deleteTempCycleTemplate);

// Inspections
router.get('/:jobCardId/inspection', auth, ctrl.getInspection);
router.post('/:jobCardId/inspection', auth, requireRole('OPERATOR'), uploadFiveImages('inspections'), ctrl.upsertInspection);
router.put('/:jobCardId/inspection', auth, requireRole('OPERATOR'), uploadFiveImages('inspections'), ctrl.upsertInspection);

module.exports = router;
