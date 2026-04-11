const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/attachment.controller');
const { requireRole } = require('../middleware/role');
const { upload, validateUploadedFiles, uploadErrorHandler } = require('../middleware/fileUpload');

// Upload (Operator+). Uses multipart/form-data with field name: files
router.post(
  '/upload',
  auth,
  requireRole('OPERATOR'),
  upload.array('files', 5),
  validateUploadedFiles,
  uploadErrorHandler,
  ctrl.uploadAttachment
);

// List/search
router.get('/', auth, requireRole('OPERATOR'), ctrl.getAttachments);
router.get('/search', auth, requireRole('OPERATOR'), ctrl.searchAttachments);

// Single
router.get('/:id', auth, requireRole('OPERATOR'), ctrl.getAttachmentById);
router.get('/:id/download', auth, requireRole('OPERATOR'), ctrl.downloadAttachment);

// Mutations (owner enforced in controller)
router.patch('/:id', auth, requireRole('OPERATOR'), ctrl.updateAttachment);
router.delete('/:id', auth, requireRole('OPERATOR'), ctrl.deleteAttachment);

module.exports = router;

