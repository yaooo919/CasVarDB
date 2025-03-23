const express = require('express');
const axios = require("axios");

const router = express.Router();

router.get('/freq-per-variant', async (req, res) => {
  const url = `${process.env.VPN_RELAYER_URL}/statistics/freq-per-variant`;
  const response = await axios.get(url);
  res.send(response.data);
});

router.get('/freq-per-scaffold', async (req, res) => {
  const url = `${process.env.VPN_RELAYER_URL}/statistics/freq-per-scaffold`;
  const response = await axios.get(url);
  res.send(response.data);
});

router.get('/data-count-per-study', async (req, res) => {
  const url = `${process.env.VPN_RELAYER_URL}/statistics/data-count-per-study`;
  const response = await axios.get(url);
  res.send(response.data);
});

router.get('/freq-per-mismatch', async (req, res) => {
  const url = `${process.env.VPN_RELAYER_URL}/statistics/freq-per-mismatch`;
  const response = await axios.get(url);
  res.send(response.data);
});

router.get('/freq-mismatch-per-variant', async (req, res) => {
  const url = `${process.env.VPN_RELAYER_URL}/statistics/freq-mismatch-per-variant`;
  const response = await axios.get(url);
  res.send(response.data);
});

router.get('/heatmap-data', async (req, res) => {
  const url = `${process.env.VPN_RELAYER_URL}/statistics/heatmap-data`;
  const response = await axios.get(url);
  res.send(response.data);
});

router.get('/activity-graph', async (req, res) => {
  const { pam, numberOfMismatches, variants, mismatchPosition } = req.query;
  const url = `${process.env.VPN_RELAYER_URL}/statistics/activity-graph?pam=${pam}&numberOfMismatches=${numberOfMismatches}&variants[]=${variants.join('&variants[]=')}&mismatchPosition=${mismatchPosition}`;
  const response = await axios.get(url);
  res.json(response.data);
});

module.exports = router;
