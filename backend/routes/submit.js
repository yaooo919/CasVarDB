const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    cb(null, `${ts}__${safe}`);
  },
});
const upload = multer({ storage });

router.post('/', upload.single('file'), (req, res) => {
  const file = req.file;
  const rawMetadata = req.body?.metadata;

  if (!file || !rawMetadata) {
    return res.status(400).json({ message: 'File and metadata are required.' });
  }

  let userMetadata;
  try {
    userMetadata = JSON.parse(rawMetadata);
  } catch (_e) {
    userMetadata = { raw: String(rawMetadata) };
  }

  const record = {
    uploadedAt: new Date().toISOString(),
    originalFileName: file.originalname,
    storedFileName: path.basename(file.path),
    fileSize: file.size,
    mimeType: file.mimetype,
    userMetadata,
  };

  const metaPath = path.join(uploadDir, `${path.basename(file.path)}.meta.json`);
  try {
    fs.writeFileSync(metaPath, JSON.stringify(record, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save metadata:', err);
    return res.status(500).json({ message: 'Failed to save metadata.' });
  }

  console.log('File received:', file.path);
  console.log('Metadata saved to:', metaPath);

  return res.status(200).json({
    message: 'File & metadata uploaded successfully.',
    fileName: file.originalname,
    filePath: file.path,
    metadataSavedTo: metaPath,
    parsedMetadataKind: userMetadata.raw ? 'raw' : 'json',
  });
});

module.exports = router;
