/**
 * File Upload Validation Middleware
 * Validates file size, type, and prevents malicious uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create upload directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types by category
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  document: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

// Size limits in bytes
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  pdf: 20 * 1024 * 1024, // 20MB
  default: 5 * 1024 * 1024, // 5MB
};

/**
 * Get file category from MIME type
 */
const getFileCategory = (mimetype) => {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimetype)) {
      return category;
    }
  }
  return null;
};

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create category-specific folders
    const category = getFileCategory(file.mimetype) || 'other';
    const categoryDir = path.join(uploadsDir, category);
    
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    cb(null, categoryDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename: timestamp-randomhash-originalname
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${timestamp}-${hash}${ext}`;
    
    cb(null, filename);
  },
});

/**
 * File filter - only allow whitelisted types AND extensions
 */
const fileFilter = (req, file, cb) => {
  const allAllowedTypes = Object.values(ALLOWED_TYPES).flat();
  
  // ✅ FIXED: Add extension whitelist to prevent masquerading
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
  
  if (!allAllowedTypes.includes(file.mimetype)) {
    return cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed types: ${allAllowedTypes.join(', ')}`));
  }
  
  if (!allowedExts.includes(ext)) {
    return cb(new Error(`File extension '${ext}' is not allowed. Allowed: ${allowedExts.join(', ')}`));
  }
  
  cb(null, true);
};

/**
 * Size validation function
 */
const validateFileSize = (req, file, cb) => {
  const category = getFileCategory(file.mimetype) || 'default';
  const maxSize = SIZE_LIMITS[category];
  
  // Check size before upload completes
  req.on('data', (chunk) => {
    req.uploadedSize = (req.uploadedSize || 0) + chunk.length;
    
    if (req.uploadedSize > maxSize) {
      req.uploadSizeExceeded = true;
    }
  });
  
  cb(null);
};

/**
 * Create multer instance with validation
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: SIZE_LIMITS.default, // Default limit, per-category enforced below
    files: 5, // Max 5 files per request
  },
});

/**
 * Middleware to validate uploaded files after multer processing
 */
const validateUploadedFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const errors = [];

  for (const file of req.files) {
    const category = getFileCategory(file.mimetype) || 'default';
    const maxSize = SIZE_LIMITS[category];

    // Validate file size (check actual file size after upload)
    if (file.size > maxSize) {
      fs.unlinkSync(file.path); // Delete invalid file
      errors.push({
        filename: file.originalname,
        error: `File size exceeds limit. Max: ${Math.round(maxSize / 1024 / 1024)}MB`,
      });
      continue;
    }

    // Validate MIME type (check file extension)
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = {
      '.jpg': true,
      '.jpeg': true,
      '.png': true,
      '.webp': true,
      '.pdf': true,
      '.doc': true,
      '.docx': true,
      '.xls': true,
      '.xlsx': true,
    };

    if (!allowedExts[ext]) {
      fs.unlinkSync(file.path);
      errors.push({
        filename: file.originalname,
        error: `File extension '${ext}' is not allowed`,
      });
      continue;
    }

    // Add validated file info
    file.uploadPath = `/uploads/${getFileCategory(file.mimetype) || 'other'}/${file.filename}`;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      code: 'UPLOAD_VALIDATION_FAILED',
      message: 'Some files failed validation',
      errors,
    });
  }

  next();
};

/**
 * Cleanup middleware - delete files on error
 */
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({
        success: false,
        code: 'FILE_TOO_LARGE',
      message: `File exceeds maximum size limit (${Math.round(SIZE_LIMITS.default / 1024 / 1024)}MB)`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        code: 'TOO_MANY_FILES',
        message: 'Maximum 5 files per upload',
      });
    }
  }

  if (err?.message?.includes('not allowed')) {
    return res.status(415).json({
      success: false,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: err.message,
    });
  }

  if (err) {
    return res.status(500).json({
      success: false,
      code: 'UPLOAD_ERROR',
      message: 'Failed to upload file',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  next();
};

module.exports = {
  upload,
  validateUploadedFiles,
  uploadErrorHandler,
  ALLOWED_TYPES,
  SIZE_LIMITS,
  getFileCategory,
};
