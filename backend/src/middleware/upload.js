const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { toInt } = require('../utils/normalize');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// CRITICAL FIX: Comprehensive file type validation
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  // Documents
  'application/pdf': '.pdf',
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
  // CRITICAL FIX: Strict MIME type validation
  const mimeAllowed = ALLOWED_MIME_TYPES[file.mimetype];
  
  if (!mimeAllowed) {
    return cb(new Error(`File type '${file.mimetype}' not allowed. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`), false);
  }
  
  // Verify extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  if (mimeAllowed !== ext) {
    return cb(new Error(`File extension '${ext}' does not match MIME type '${file.mimetype}'`), false);
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

module.exports = { upload, uploadFiveImages };
