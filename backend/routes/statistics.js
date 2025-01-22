const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
  const query = `
    SELECT variant, mean_background_subtracted_indel_frequency, study 
    FROM cas9
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    res.json(rows);
  });
});

module.exports = router;
