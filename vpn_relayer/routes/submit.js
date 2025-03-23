const express = require('express');
const axios = require('axios');
const fs = require('fs');

const router = express.Router();

router.post('/', async (req, res) => {
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

    const response = await axios.post(`${process.env.VPN_RELAYER_URL}/submit`, formData, {
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
