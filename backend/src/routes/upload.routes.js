const router = require('express').Router();
const auth   = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const fs     = require('fs');
const path   = require('path');

// Single image upload
router.post('/single', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const url = `/uploads/${req.uploadSubDir || 'general'}/${req.file.filename}`;
  res.json({ success: true, url, filename: req.file.filename });
});

// Delete uploaded file
router.delete('/', auth, (req, res) => {
  const { filepath } = req.body;
  if (!filepath) return res.status(400).json({ success: false, message: 'File path required.' });
  const abs = path.join(__dirname, '../../', filepath);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
    res.json({ success: true, message: 'File deleted.' });
  } else {
    res.status(404).json({ success: false, message: 'File not found.' });
  }
});

module.exports = router;
