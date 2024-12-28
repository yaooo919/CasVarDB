const express = require('express');
const router = express.Router();
const db = require('../config/db');

const allowedSearchFields = [
  'spacer_sequence_raw',
  'target_context_sequence_raw',
  'spacer_sequence',
  'target_context_sequence',
  'variant',
  'nuclease',
  'gRNA_scaffold',
  'day',
  'tRNA_feature',
  'study',
];

router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const searchTerm = req.query.searchTerm || "";
  const searchField = req.query.searchField || "spacer_sequence_raw";
  const sortField = req.query.sortField || "id";
  const sortDirection = req.query.sortDirection || "ASC";

  if (!allowedSearchFields.includes(searchField)) {
    return res.status(400).json({ error: "Invalid search field" });
  }

  const offset = (page - 1) * pageSize;

  let countQuery = "SELECT COUNT(*) AS total FROM cas9";
  const queryParams = [];

  if (searchTerm) {
    countQuery += ` WHERE ?? LIKE ?`;
    queryParams.push(searchField, `%${searchTerm}%`);
  }

  db.query(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error("Error fetching total count:", err);
      return res.status(500).json({ error: "Failed to fetch total count" });
    }

    const total = countResult[0].total;

    let dataQuery = "SELECT * FROM cas9";
    if (searchTerm) {
      dataQuery += ` WHERE ?? LIKE ?`;
    }
    dataQuery += ` ORDER BY ?? ${sortDirection} LIMIT ? OFFSET ?`;

    db.query(
      dataQuery,
      [...queryParams, sortField, pageSize, offset],
      (err, results) => {
        if (err) {
          console.error("Error fetching data:", err);
          return res.status(500).json({ error: "Failed to fetch data" });
        }

        res.json({ rows: results, total });
      }
    );
  });
});

module.exports = router;
