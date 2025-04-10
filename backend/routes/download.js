const express = require('express');
const router = express.Router();
const db = require('../config/db');

const convertToCSV = (data) => {
  if (data.length === 0) return ''; 
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((header) => row[header]).join(','));
  return [headers.join(','), ...rows].join('\n');
};

router.post('/', (req, res) => {
  const { selectedIds } = req.body;
  
  if (!selectedIds || selectedIds.length === 0) {
    return res.status(400).send('No IDs provided');
  }
  
  const query = `SELECT * FROM cas9 WHERE id IN (${selectedIds.join(',')});`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).send('No data found for the provided IDs');
    }

    
    const csvData = convertToCSV(results);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('selected_data.csv');
    res.send(csvData);

    }); 
  });
  
module.exports = router;
