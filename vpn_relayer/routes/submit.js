const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;
  const metadata = req.body.metadata;

  console.log("File buffer length:", file.buffer.length);
  console.log("File buffer content (first 100 bytes):", file.buffer.slice(0, 100).toString())

  if (!file || !metadata) {
    return res.status(400).json({ message: 'File and metadata are required.' });
  }

  console.log('Received file in vpn_relayer:', file);
  console.log('Received metadata:', metadata);

  try {
    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);
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
