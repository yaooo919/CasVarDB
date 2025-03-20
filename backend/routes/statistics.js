const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require("fs").promises;

const median = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

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

const processFreqPerMismatchData = (data) => {
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

const processFreqMismatchPerVariantData = (data) => {
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

const processHeatmapData = (data) => {
  const heatmapData = {};
  const activityOn = {};

  data.forEach(({ number_of_mismatches, variant, mean_background_subtracted_indel_frequency }) => {
    if (number_of_mismatches === 0) {
      if (!activityOn[variant]) {
        activityOn[variant] = [];
      }
      activityOn[variant].push(mean_background_subtracted_indel_frequency);
    }
  });

  Object.keys(activityOn).forEach((variant) => {
    const values = activityOn[variant];
    activityOn[variant] = values.reduce((sum, val) => sum + val, 0) / values.length;
  });

  data.forEach(({ number_of_mismatches, variant, mean_background_subtracted_indel_frequency, mismatch_position }) => {
    if (number_of_mismatches === 0) return;

    if (!heatmapData[variant]) {
      heatmapData[variant] = {};
    }

    const x = Number(mismatch_position) - 1;
    if (!heatmapData[variant][x]) {
      heatmapData[variant][x] = { raw: [], normalized: [] };
    }
    heatmapData[variant][x].raw.push(mean_background_subtracted_indel_frequency);
  });

  Object.keys(heatmapData).forEach((variant) => {
    Object.keys(heatmapData[variant]).forEach((x) => {
      const rawValues = heatmapData[variant][x].raw;

      const rawMean = rawValues.reduce((sum, val) => sum + val, 0) / rawValues.length;
      const normalizedValue = rawMean / activityOn[variant];

      heatmapData[variant][x].raw = rawMean;
      heatmapData[variant][x].normalized = normalizedValue;
    });
  });
  console.log(heatmapData);
  return heatmapData;
};


router.get('/freq-per-variant', (req, res) => {
  const query = `
    SELECT variant, mean_background_subtracted_indel_frequency 
    FROM cas9
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }
    res.json(processFreqPerVariantData(rows));
  });
});

router.get('/freq-per-scaffold', (req, res) => {
  const query = `
    SELECT gRNA_scaffold, mean_background_subtracted_indel_frequency 
    FROM cas9
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    res.json(processFreqPerScaffoldData(rows));
  });
});

router.get('/data-count-per-study', (req, res) => {
  const query = `
    SELECT study 
    FROM cas9
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    res.json(processDataCountPerStudy(rows));
  });
});

router.get('/freq-per-mismatch', (req, res) => {
  const query = `
    SELECT number_of_mismatches, mean_background_subtracted_indel_frequency 
    FROM cas9
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    res.json(processFreqPerMismatchData(rows));
  });
});

router.get('/freq-mismatch-per-variant', (req, res) => {
  const query = `
    SELECT variant, number_of_mismatches, mean_background_subtracted_indel_frequency 
    FROM cas9
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    res.json(processFreqMismatchPerVariantData(rows));
  });
});

router.get('/heatmap-data', (req, res) => {
  const query = `
    SELECT number_of_mismatches, variant, mean_background_subtracted_indel_frequency, mismatch_position 
    FROM cas9
    WHERE number_of_mismatches = 0 OR number_of_mismatches = 1
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    res.json(processHeatmapData(rows));
  });
});

// router.get("/heatmap-data", async (req, res) => {
//   try {
//     const data = await fs.readFile("data.txt", "utf-8");
//     res.json(JSON.parse(data));
//     console.log(data);
//   } catch (error) {
//     console.error("Error reading file:", error);
//     res.status(500).json({ error: "Failed to read data file" });
//   }
// });

const IUPAC_REGEX_MAP = {
  'A': 'A',
  'T': 'T',
  'C': 'C',
  'G': 'G',
  'R': '[AG]',   
  'Y': '[CT]', 
  'S': '[GC]',    
  'W': '[AT]',   
  'K': '[GT]',   
  'M': '[AC]', 
  'B': '[CGT]',  
  'D': '[AGT]', 
  'H': '[ACT]',  
  'V': '[ACG]',   
  'N': '[ATCG]',  
};

const convertIUPACtoRegex = (pam) => {
  return pam
    .toUpperCase()
    .split('')
    .map(char => IUPAC_REGEX_MAP[char])
    .join('');
};

// router.get("/activity-graph", async (req, res) => {
//     try {
//       const data = await fs.readFile("sample_data_interactive_graph.txt", "utf-8");
//       return res.json({ data: JSON.parse(data) });
//     } catch (error) {
//       console.error("Error reading file:", error);
//       res.status(500).json({ error: "Failed to read data file" });
//     }
//   });

router.get('/activity-graph', (req, res) => {
  const { pam, numberOfMismatches, variants, mismatchPosition } = req.query;

  const variantList = Array.isArray(variants) ? variants : [variants];

  if (variantList.length === 0) {
    return res.status(400).json({ error: 'At least one variant must be selected' });
  }

  const pamLength = pam.length;
  const regexPattern = convertIUPACtoRegex(pam);
  
  let query = `
    SELECT variant, mean_background_subtracted_indel_frequency
    FROM cas9
    WHERE
      SUBSTRING(target_context_sequence FROM 28 FOR ?) REGEXP ?
      AND number_of_mismatches = ?
      AND variant IN (${variantList.map(() => '?').join(',')})
  `;

  const queryParams = [pamLength, `^${regexPattern}$`, numberOfMismatches, ...variantList];

  if (numberOfMismatches == 1 && mismatchPosition) {
    query += `AND mismatch_position = ?`;
    queryParams.push(mismatchPosition);
  }

  console.log('SQL:', query);
  console.log('Params:', queryParams);

  db.query(query, queryParams, (err, rows) => {
    console.log(query);
    if (err) {
      console.error('Error fetching activity graph data:', err);
      return res.status(500).json({ error: 'Failed to fetch activity graph data' });
    }

    const groupedData = rows.reduce((acc, row) => {
      const { variant, mean_background_subtracted_indel_frequency } = row;
      if (!acc[variant]) acc[variant] = [];
      acc[variant].push(mean_background_subtracted_indel_frequency);
      return acc;
    }, {});

    return res.json({ data: groupedData });
  });
});

module.exports = router;
