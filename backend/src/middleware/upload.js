const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { toInt } = require('../utils/normalize');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// CRITICAL FIX: Comprehensive file type validation
const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/gif':  ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

/**
 * Sanitize filename to prevent path traversal and special characters
 * CRITICAL SECURITY FIX: Remove dangerous characters
 */
const sanitizeFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const name = path.basename(originalname, ext)
    .replace(/[^a-zA-Z0-9\._-]/g, '_')  // Replace special chars with underscore
    .replace(/^\.+/, '')                 // Remove leading dots
    .substring(0, 200);                  // Limit length
  
  return `${name}${ext}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organise by type: uploads/inspections/, uploads/certificates/
    const subDir = req.uploadSubDir || 'general';
    const dir = path.join(uploadDir, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // CRITICAL FIX: Sanitize filename and prevent traversal attacks
    const sanitized = sanitizeFilename(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitized}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ALLOWED_MIME_TYPES[file.mimetype];
  if (!allowedExts) {
    return cb(new Error(`File type '${file.mimetype}' not allowed. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`), false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(new Error(`File extension '${ext}' does not match type '${file.mimetype}'. Allowed extensions: ${allowedExts.join(', ')}`), false);
  }
  cb(null, true);
};

// CRITICAL FIX: Enforce file size limits more strictly
const MAX_FILE_SIZE = toInt(process.env.MAX_FILE_SIZE, 5 * 1024 * 1024); // 5 MB default
const MAX_TOTAL_SIZE = toInt(process.env.MAX_TOTAL_UPLOAD_SIZE, 50 * 1024 * 1024); // 50 MB for entire request

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 5,  // Limit number of files
  },
});

// Middleware for exactly 5 image slots named image1..image5
const uploadFiveImages = (subDir = 'general') => (req, res, next) => {
  req.uploadSubDir = subDir;
  
  // CRITICAL FIX: Validate total request size before processing
  const contentLength = parseInt(req.headers['content-length'] || 0);
  if (contentLength > MAX_TOTAL_SIZE) {
    return res.status(413).json({ 
      success: false, 
      code: 'ERR_FILE_TOO_LARGE',
      message: `Total upload size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit` 
    });
  }
  
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
    { name: 'image5', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      // Distinguish between different error types
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          success: false, 
          code: 'ERR_FILE_TOO_LARGE',
          message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          success: false, 
          code: 'ERR_TOO_MANY_FILES',
          message: 'Too many files uploaded. Maximum 5 files allowed.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        code: 'ERR_FILE_UPLOAD',
        message: err.message 
      });
    }
    next();
  });
};

// ── Document / attachment uploads ─────────────────────────────
// Extends image/pdf types with office docs and spreadsheets
const DOC_MIME_TYPES = {
  ...ALLOWED_MIME_TYPES,
  'application/msword':     ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const docFileFilter = (req, file, cb) => {
  const allowedExts = DOC_MIME_TYPES[file.mimetype];
  if (!allowedExts) {
    return cb(new Error(`File type '${file.mimetype}' not allowed.`), false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(new Error(`Extension '${ext}' does not match type '${file.mimetype}'.`), false);
  }
  cb(null, true);
};

const uploadDoc = multer({
  storage,
  fileFilter: docFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

/** Array-style upload for attachments (images + PDFs + office docs) */
const uploadFiles = (subDir = 'attachments', maxFiles = 5) => (req, res, next) => {
  req.uploadSubDir = subDir;
  uploadDoc.array('files', maxFiles)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, code: 'ERR_FILE_TOO_LARGE', message: 'File exceeds 10MB limit.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, code: 'ERR_TOO_MANY_FILES', message: `Maximum ${maxFiles} files allowed.` });
    }
    return res.status(400).json({ success: false, code: 'ERR_FILE_UPLOAD', message: err.message });
  });
};

/** Post-upload validation: size and extension double-check, clean up rejects */
const validateUploadedFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();
  const errors = [];
  for (const file of req.files) {
    const allowedExts = DOC_MIME_TYPES[file.mimetype] || [];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext) || file.size > 10 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      errors.push({ filename: file.originalname, error: !allowedExts.includes(ext) ? `Extension '${ext}' not allowed.` : 'Exceeds 10MB limit.' });
    }
  }
  if (errors.length > 0) {
    return res.status(400).json({ success: false, code: 'UPLOAD_VALIDATION_FAILED', errors });
  }
  next();
};

/** Error handler for multer errors — must have 4 params to be recognised as error middleware */
const uploadErrorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE')    return res.status(413).json({ success: false, code: 'FILE_TOO_LARGE',   message: 'File exceeds maximum size limit.' });
    if (err.code === 'LIMIT_FILE_COUNT')  return res.status(400).json({ success: false, code: 'TOO_MANY_FILES',   message: 'Maximum 5 files per upload.' });
  }
  if (err?.message?.includes('not allowed')) {
    return res.status(415).json({ success: false, code: 'UNSUPPORTED_MEDIA_TYPE', message: err.message });
  }
  if (err) {
    return res.status(500).json({ success: false, code: 'UPLOAD_ERROR', message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to upload file.' });
  }
  next();
};

module.exports = { upload, uploadFiveImages, uploadFiles, validateUploadedFiles, uploadErrorHandler };
