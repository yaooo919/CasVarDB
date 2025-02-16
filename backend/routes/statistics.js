const express = require('express');
const router = express.Router();
const db = require('../config/db');

const median = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};


const processData = (data) => {
  const processFreqPerVariantData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const { variant, mean_background_subtracted_indel_frequency } = item;
      if (!acc[variant]) {
        acc[variant] = [];
      }
      acc[variant].push(mean_background_subtracted_indel_frequency);
      return acc;
    }, {});

    const sortedVariants = Object.entries(groupedData)
      .map(([variant, values]) => ({ variant, values, median: median(values) }))
      .sort((a, b) => b.median - a.median);

    return {
      labels: sortedVariants.map((item) => item.variant),
      datasets: [
        {
          label: "Mean Background Subtracted Indel Frequency",
          data: sortedVariants.map((item) => item.values),
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  };


  const processFreqPerScaffoldData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const { gRNA_scaffold, mean_background_subtracted_indel_frequency } = item;
      if (!acc[gRNA_scaffold]) acc[gRNA_scaffold] = [];
      acc[gRNA_scaffold].push(mean_background_subtracted_indel_frequency);
      return acc;
    }, {});

    const sortedScaffolds = Object.entries(groupedData)
      .map(([scaffold, values]) => ({ scaffold, values, median: median(values) }))
      .sort((a, b) => b.median - a.median);

    return {
      labels: sortedScaffolds.map((item) => item.scaffold),
      datasets: [
        {
          label: "Mean Background Subtracted Indel Frequency",
          data: sortedScaffolds.map((item) => item.values),
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  };


  const processDataCountPerStudy = (data) => {
    const studyCounts = data.reduce((acc, item) => {
      let study = JSON.stringify(item.study).replace(/"\['xCas9_NG', 'xCas9_NG'\]"/, "\"['xCas9_NG']\"");
      if (!acc[study]) {
        acc[study] = 0;
      }
      acc[study] += 1;
      return acc;
    }, {});

    const labels = Object.keys(studyCounts);
    const datasets = [
      {
        label: "Number of Data per Study",
        data: Object.values(studyCounts),
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ];

    return { labels, datasets };
  };


  const processMeanFrequencyPerMismatchData = (data) => {
    const mismatchGroups = data.reduce((acc, item) => {
      const { number_of_mismatches, mean_background_subtracted_indel_frequency } = item;
      if (!acc[number_of_mismatches]) {
        acc[number_of_mismatches] = [];
      }
      acc[number_of_mismatches].push(mean_background_subtracted_indel_frequency);
      return acc;
    }, {});

    const labels = Object.keys(mismatchGroups).sort((a, b) => a - b);
    const datasets = [
      {
        label: "Mean Background Subtracted Indel Frequency vs Number of Mismatches",
        data: labels.map((key) => ({
          x: parseFloat(key),
          y: mismatchGroups[key].reduce((sum, val) => sum + val, 0) / mismatchGroups[key].length, // average of mean frequency
        })),
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        fill: false,
        tension: 0.1,
      },
    ];

    return { labels, datasets };
  };

 
  const processMeanFrequencyPerVariantData = (data) => {
    const variantData = data.reduce((acc, item) => {
      const { variant, number_of_mismatches, mean_background_subtracted_indel_frequency } = item;
      if (!acc[variant]) {
        acc[variant] = [];
      }
      acc[variant].push({ number_of_mismatches, mean_background_subtracted_indel_frequency });
      return acc;
    }, {});

    const labels = [...new Set(data.map((item) => item.number_of_mismatches))].sort((a, b) => a - b);

    const datasets = Object.keys(variantData).map((variant) => ({
      label: `${variant}`,
      data: labels.map((mismatchCount) => {
        const filteredData = variantData[variant].filter(
          (item) => item.number_of_mismatches === mismatchCount
        );
        const meanFrequency = filteredData.reduce((sum, item) => sum + item.mean_background_subtracted_indel_frequency, 0) / filteredData.length;
        return { x: mismatchCount, y: meanFrequency };
      }),
      borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // random color
      backgroundColor: "rgba(75, 192, 192, 0.2)",
      borderWidth: 1,
      fill: false,
      tension: 0.1,
    }));

    return { labels, datasets };
  };

  return {
    freqPerVariant: processFreqPerVariantData(data),
    freqPerScaffold: processFreqPerScaffoldData(data),
    dataCountPerStudy: processDataCountPerStudy(data),
    meanFrequencyPerMismatch: processMeanFrequencyPerMismatchData(data),
    meanFrequencyPerVariant: processMeanFrequencyPerVariantData(data),
  };
};


router.get('/', (req, res) => {
  const query = `
    SELECT target_context_sequence_raw, variant, gRNA_scaffold, mean_background_subtracted_indel_frequency, study, number_of_mismatches, best_matching_substring, mismatch_indexes 
    FROM cas9
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    const processdData = processData(rows);
    res.json(processdData);
  });
});

module.exports = router;
