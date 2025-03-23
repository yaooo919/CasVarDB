const express = require('express');
const axios = require("axios");

const router = express.Router();

router.post('/', async (req, res) => {
  const { selectedIds } = req.body;
  
  if (!selectedIds || selectedIds.length === 0) {
    return res.status(400).send('No IDs provided');
  }

  try {
    const response = await axios.post(`${process.env.VPN_RELAYER_URL}/download`, {selectedIds});
    res.send(response.data);
  } catch (err) {
    console.error("Error redirecting request:", err);
    return res.status(500).json({ error: err.message });
  }
});
  
module.exports = router;
