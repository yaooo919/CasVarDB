const express = require('express');
const axios = require("axios");

const router = express.Router();

router.get('/', async(req, res) => {
  const sortField = req.query.sortField || "id";
  const sortDirection = req.query.sortDirection || "ASC";

  const url = `${process.env.BACKEND_URL}/grna?sortField=${sortField}&sortDirection=${sortDirection}`;
  const response = await axios.get(url);
  res.json(response.data);
});

module.exports = router;