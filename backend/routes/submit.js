const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
});

router.post('/', upload.single('file'), (req, res) => {
  const file = req.file; 
  const metadata = req.body.metadata; 

  if (!file || !metadata) {
    return res.status(400).json({ message: 'File and metadata are required.' });
  }

  res.status(200).json({
    message: 'File uploaded successfully.',
    fileName: file.originalname,
    filePath: file.path,
    metadata,
  });
});

module.exports = router;
