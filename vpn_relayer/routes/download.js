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
    let csvData = response.data;
    csvData = csvData.split('\n').filter(line => line.trim() !== '').join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('selected_data.csv');
    res.send(csvData);
  } catch (err) {
    console.error("Error redirecting request:", err);
    return res.status(500).json({ error: err.message });
  }
});
  
module.exports = router;
