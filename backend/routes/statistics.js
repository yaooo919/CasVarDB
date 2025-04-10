const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require("fs").promises;

// stats for boxplot
const calculateStats = (data) => {
  const sortedData = data.slice().sort((a, b) => a - b);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const mean = sortedData.reduce((sum, val) => sum + val, 0) / sortedData.length;
  const median = calculatePercentile(sortedData, 0.5);
  const q1 = calculatePercentile(sortedData, 0.25);
  const q3 = calculatePercentile(sortedData, 0.75);
  // console.log(median, min, max, mean, q1, q3);

  return { min, max, mean, median, q1, q3 };
};

const calculatePercentile = (sortedData, percentile) => {
  const index = percentile * (sortedData.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sortedData[lower];
  }
  return sortedData[lower] + (sortedData[upper] - sortedData[lower]) * (index - lower);
};

const processFreqPerVariantData = (rows) => {
  const groupedData = {};

  rows.forEach((row) => {
    const { variant, mean_background_subtracted_indel_frequency } = row;
    if (!groupedData[variant]) {
      groupedData[variant] = [];
    }
    groupedData[variant].push(mean_background_subtracted_indel_frequency);
  });

  const result = {};

  Object.keys(groupedData).forEach((variant) => {
    result[variant] = calculateStats(groupedData[variant]);
  });

  return result;
};

const processFreqPerScaffoldData = (rows) => {
  const groupedData = {};

  rows.forEach((row) => {
    const { gRNA_scaffold, mean_background_subtracted_indel_frequency } = row;
    if (!groupedData[gRNA_scaffold]) {
      groupedData[gRNA_scaffold] = [];
    }
    groupedData[gRNA_scaffold].push(mean_background_subtracted_indel_frequency);
  });

  const result = {};

  Object.keys(groupedData).forEach((gRNA_scaffold) => {
    result[gRNA_scaffold] = calculateStats(groupedData[gRNA_scaffold]);
  });

  return result;
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

  return studyCounts;
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

  const processedData = Object.keys(mismatchGroups).reduce((acc, key) => {
    const avgFrequency = mismatchGroups[key].reduce((sum, val) => sum + val, 0) / mismatchGroups[key].length;
    acc[key] = avgFrequency;
    return acc;
  }, {});

  return processedData;
};

const processFreqMismatchPerVariantData = (data) => {
  const variantData = data.reduce((acc, item) => {
    const { variant, number_of_mismatches, mean_background_subtracted_indel_frequency } = item;
    if (!acc[variant]) {
      acc[variant] = {};
    }
    if (!acc[variant][number_of_mismatches]) {
      acc[variant][number_of_mismatches] = [];
    }
    acc[variant][number_of_mismatches].push(mean_background_subtracted_indel_frequency);

    return acc;
  }, {});

  const processedData = Object.keys(variantData).map((variant) => {
    const frequencyData = variantData[variant];
    const averageFreqPerMismatch = {};

    Object.keys(frequencyData).forEach((mismatchCount) => {
      const frequencies = frequencyData[mismatchCount];
      const averageFrequency = frequencies.reduce((sum, val) => sum + val, 0) / frequencies.length;
      averageFreqPerMismatch[mismatchCount] = averageFrequency;
    });

    return {
      variant,
      ...averageFreqPerMismatch,
    };
  });

  return processedData;
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

  data.forEach(({ number_of_mismatches, variant, mean_background_subtracted_indel_frequency, mismatch_positions }) => {
    if (number_of_mismatches === 0) return;

    if (!heatmapData[variant]) {
      heatmapData[variant] = {};
    }

    const x = JSON.parse(mismatch_positions)[0] - 1;
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
  // console.log(heatmapData);
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
    SELECT number_of_mismatches, variant, mean_background_subtracted_indel_frequency, mismatch_positions 
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

// mock data for testing
// router.get("/heatmap-data", async (req, res) => {
//   try {
//     const data = await fs.readFile("heatmap_data.txt", "utf-8");
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

// mock data for testing
// router.get("/activity-graph", async (req, res) => {
//     try {
//       const data = await fs.readFile("nteractive_graph_data.txt", "utf-8");
//       return res.json({ data: JSON.parse(data) });
//     } catch (error) {
//       console.error("Error reading file:", error);
//       res.status(500).json({ error: "Failed to read data file" });
//     }
//   });

router.get('/activity-graph', (req, res) => {
  const { pam, numberOfMismatches, variant, mismatchPosition } = req.query;

  const pamLength = pam.length;
  const regexPattern = convertIUPACtoRegex(pam);
  
  let query = `
    SELECT variant, mean_background_subtracted_indel_frequency
    FROM cas9
    WHERE
      SUBSTRING(target_context_sequence FROM 28 FOR ?) REGEXP ?
      AND number_of_mismatches = ?
      AND variant = ?
  `;

  const queryParams = [pamLength, `^${regexPattern}$`, numberOfMismatches, variant];

  if (numberOfMismatches == 1 && mismatchPosition) {
    query += `AND mismatch_positions = ?`;
    queryParams.push(mismatchPosition);
  }

  db.query(query, queryParams, (err, rows) => {
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

    return res.json(groupedData);
  });
});

module.exports = router;
