const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
  const take = parseInt(req.query.take) || 50;
  const offset = parseInt(req.query.offset) || 0;

  let whereClauses = [];
  let queryParams = [];

  Object.keys(req.query).forEach((key) => {
    if (key !== 'take' && key !== 'offset' && req.query[key]) {
      whereClauses.push(`${key} LIKE ?`);
      queryParams.push(`%${req.query[key]}%`);
    }
  });

  const countQuery = `SELECT COUNT(*) AS total FROM cas9 ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;
  const dataQuery = `SELECT * FROM cas9 ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''} LIMIT ? OFFSET ?`;

  db.query(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Error fetching total count:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const total = countResult[0].total;

    db.query(dataQuery, [...queryParams, take, offset], (err, rows) => {
      if (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      res.json({ total, rows });
    });
  });
});

module.exports = router;
