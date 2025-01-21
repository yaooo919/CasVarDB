const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
  const sortField = req.query.sortField || "id";
  const sortDirection = req.query.sortDirection || "ASC";

  const query = `SELECT * FROM grna_scaffold ORDER BY ?? ${sortDirection}`;

  db.query(query, [sortField], (err, results) => {
    if (err) {
        return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

module.exports = router;