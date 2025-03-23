const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get("/", async (req, res) => {
  const {page, pageSize, searchField, searchTerm, sortField, sortDirection} = req.query;
  const url = `${process.env.VPN_RELAYER_URL}/data?page=${page}&pageSize=${pageSize}&searchField=${searchField}&searchTerm=${searchTerm}&sortField=${sortField}&sortDirection=${sortDirection}`;
  const response = await axios.get(url);
  res.send(response.data);
});

module.exports = router;
