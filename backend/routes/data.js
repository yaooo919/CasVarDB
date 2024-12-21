const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get("/", (req, res) => {
    const page = parseInt(req.query.page) || 1; // 当前页码
    const pageSize = parseInt(req.query.pageSize) || 100; // 每页数据条数
    const offset = (page - 1) * pageSize;
  
    db.query(
      `SELECT * FROM your_table LIMIT ? OFFSET ?`,
      [pageSize, offset],
      (err, results) => {
        if (err) {
          res.status(500).json({ error: "Failed to fetch data" });
        } else {
          res.json(results);
        }
      }
    );
  });

module.exports = router;