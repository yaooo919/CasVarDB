const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

router.post('/', upload.single('file'), (req, res) => {
  const file = req.file;
  const metadata = req.body.metadata;

  if (!file || !metadata) {
    return res.status(400).json({ message: 'File and metadata are required.' });
  }

  console.log('File received in backend:', file);
  console.log('Metadata:', metadata);

  res.status(200).json({
    message: 'File uploaded successfully.',
    fileName: file.originalname,
    filePath: file.path,
    metadata,
  });
});

module.exports = router;
