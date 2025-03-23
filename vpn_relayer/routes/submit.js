const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;
  const metadata = req.body.metadata;

  if (!file || !metadata) {
    return res.status(400).json({ message: 'File and metadata are required.' });
  }

  console.log('File saved at:', file.path);
  console.log('Received metadata:', metadata);

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), file.originalname);
    formData.append('metadata', metadata);

    const response = await axios.post(`${process.env.BACKEND_URL}/submit`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.status(200).json(response.data);
  } catch (err) {
    console.error('Error redirecting file upload:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
