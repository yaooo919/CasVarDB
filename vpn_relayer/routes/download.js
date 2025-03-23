const express = require('express');
const axios = require("axios");

const router = express.Router();

const convertToCSV = (data) => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((header) => row[header]).join(','));
  return [headers.join(','), ...rows].join('\n');
};

router.post('/', async (req, res) => {
  const { selectedIds } = req.body;
  
  if (!selectedIds || selectedIds.length === 0) {
    return res.status(400).send('No IDs provided');
  }

  try {
    const response = await axios.post(`${process.env.VPN_RELAYER_URL}/download`, {selectedIds});
    const csvData = convertToCSV(response);
    res.header('Content-Type', 'text/csv');
    res.attachment('selected_data.csv');
    res.send(csvData);
  } catch (err) {
    console.error("Error redirecting request:", err);
    return res.status(500).json({ error: err.message });
  }
});
  
module.exports = router;
