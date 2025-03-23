const express = require('express');
const router = express.Router();
const axios = require('axios');


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
  'number_of_mismatches'
];

router.get("/", async (req, res) => {
  const response = await axios.get('http://10.8.0.2:5000/data?page=1&pageSize=50&searchField=spacer_sequence_raw&searchTerm=&sortField=id&sortDirection=ASC');
  res.send(response.data);
});

module.exports = router;
