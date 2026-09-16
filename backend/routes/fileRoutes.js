const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { uploadFile, downloadFile } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Block potentially dangerous executable file types; allow common docs/media
const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.dll'];
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error('This file type is not allowed for security reasons'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB cap
});

router.use(protect);
router.post('/:roomId', upload.single('file'), uploadFile);
router.get('/download/:fileId', downloadFile);

module.exports = router;
