const express = require('express');
const router = express.Router();
const db = require('../config/db');

const allowedSearchFields = [
  "id",
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
  'number_of_mismatches'
];

router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const searchTerm = req.query.searchTerm || "";
  const searchField = req.query.searchField || "id";
  const sortField = req.query.sortField || "id";
  const sortDirection = req.query.sortDirection || "ASC";

  // if (!allowedSearchFields.includes(searchField)) {
  //   return res.status(400).json({ error: "Invalid search field" });
  // }
  if (!allowedSearchFields.includes(searchField)) {
    console.log("received searchField", searchField);
    console.log("allowed searchField", allowedSearchFields);
    return res.status(400).json({
      error: 'Invalid search field',
      received: searchField,
      allowed: allowedSearchFields
    });
  }

  const offset = (page - 1) * pageSize;

  // -------- Count Query --------
  let countQuery = "SELECT COUNT(*) AS total FROM cas9";
  const countParams = [];

  if (searchTerm) {
    if (searchField === "id") {
      countQuery += ` WHERE ?? = ?`;
      countParams.push(searchField, Number(searchTerm));
    } else {
      countQuery += ` WHERE ?? LIKE ?`;
      countParams.push(searchField, `%${searchTerm}%`);
    }
  }

  db.query(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error("Error fetching total count:", err);
      return res.status(500).json({ error: "Failed to fetch total count" });
    }

    const total = countResult[0].total;

    // -------- Data Query --------
    let dataQuery = "SELECT * FROM cas9";
    const dataParams = [];

    if (searchTerm) {
      if (searchField === "id") {
        dataQuery += ` WHERE ?? = ?`;
        dataParams.push(searchField, Number(searchTerm));
      } else {
        dataQuery += ` WHERE ?? LIKE ?`;
        dataParams.push(searchField, `%${searchTerm}%`);
      }
    }
    dataQuery += ` ORDER BY ?? ${sortDirection} LIMIT ? OFFSET ?`;
    dataParams.push(sortField, pageSize, offset);

    db.query(
      dataQuery,
      dataParams,
      (err, results) => {
        if (err) {
          console.error("Error fetching data:", err);
          return res.status(500).json({ error: "Failed to fetch data" });
        }

        res.json({ data: results, count: total });
      }
    );
  });
});

module.exports = router;
