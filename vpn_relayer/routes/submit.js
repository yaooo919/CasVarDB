const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
});

router.post('/', upload.single('file'), async (req, res) => {
  const file = req.file; 
  const metadata = req.body.metadata; 

  if (!file || !metadata) {
    return res.status(400).json({ message: 'File and metadata are required.' });
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), file.originalname);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await axios.post(`${process.env.VPN_RELAYER_URL}/upload`, formData, {
      headers: formData.getHeaders(),
    });

    res.status(200).json({
      message: 'File uploaded successfully.',
      targetServerResponse: response.data,
    });
  } catch (err) {
    console.error("Error redirecting file upload:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
















