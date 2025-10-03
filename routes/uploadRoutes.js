const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const uploadController = require('../controllers/uploadController');

const uploadDir = path.join(__dirname, '../../tmp_uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname);
  }
});
const fs = require('fs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ storage, fileFilter: function (req, file, cb) {
  if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
    return cb(new Error('Only CSV files allowed'));
  }
  cb(null, true);
}});

router.post('/', authMiddleware, upload.single('file'), uploadController.uploadCSV);

module.exports = router;
