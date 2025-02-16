import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale,  BarElement, LineElement, PointElement, Tooltip, Legend, Title } from "chart.js";
import { BoxPlotController, BoxAndWiskers } from "@sgratzl/chartjs-chart-boxplot";
import { Chart } from "react-chartjs-2";

ChartJS.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title);

const Statistics = () => {
  const [chartStates, setChartStates] = useState({
    freqPerVariant: { data: null, loading: true },
    freqPerScaffold: { data: null, loading: true },
    dataCountPerStudy: { data: null, loading: true },
    meanFrequencyPerMismatch: { data: null, loading: true },
    meanFrequencyPerVariant: { data: null, loading: true },
  });

  const fetchProcessedData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/statistics");
      setChartStates({
        freqPerVariant: { data: response.data.freqPerVariant, loading: false },
        freqPerScaffold: { data: response.data.freqPerScaffold, loading: false },
        dataCountPerStudy: { data: response.data.dataCountPerStudy, loading: false },
        meanFrequencyPerMismatch: { data: response.data.meanFrequencyPerMismatch, loading: false },
        meanFrequencyPerVariant: { data: response.data.meanFrequencyPerVariant, loading: false },
    });
   } catch (error) {
      console.error("Error fetching data:", error);
      setChartStates({
        freqPerVariant: { data: null, loading: false },
        freqPerScaffold: { data: null, loading: false },
        dataCountPerStudy: { data: null, loading: false },
        meanFrequencyPerMismatch: { data: null, loading: false },
        meanFrequencyPerVariant: { data: null, loading: false },
      });
    }
  };

  useEffect(() => {
    fetchProcessedData();
  }, []);

  const chartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: "bold" },
        padding: { top: 10, bottom: 10 },
      },
      tooltip: {
        enabled: true,
        mode: "nearest",
        intersect: false,
      },
      legend: {
        labels: {
          usePointStyle: true,
          pointStyle: 'rect',
          generateLabels: (chart) => {
            const labels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
            labels.forEach(label => {
              if (chart.data.datasets[label.datasetIndex]) {
                label.fillStyle = chart.data.datasets[label.datasetIndex].borderColor;
              }
            });
            return labels;
          }
        }
      }
    },
  });

  return (
    <div>
      <div className="header-container">
        <div className="header">
          <h1>Statistics</h1>
        </div>
      </div>

      {/* Frequency Per Variant Chart */}
      <div id="freq_per_variant_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 50px auto" }}>
        {chartStates.freqPerVariant.loading ? (
          <div>Loading Mean Background Subtracted Indel Frequency per Variant Chart...</div>
        ) : (
          <Chart 
            type="boxplot"
            data={chartStates.freqPerVariant.data} 
            options={chartOptions("Mean Background Subtracted Indel Frequency per Variant")} 
          />
        )}
      </div>

      {/* Frequency Per gRNA Scaffold Chart */}
      <div id="freq_per_scaffold_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 50px auto" }}>
        {chartStates.freqPerScaffold.loading ? (
          <div>Loading Mean Background Subtracted Indel Frequency per gRNA Scaffold Chart...</div>
        ) : (
          <Chart 
            type="boxplot" 
            data={chartStates.freqPerScaffold.data} 
            options={chartOptions("Mean Background Subtracted Indel Frequency per gRNA Scaffold")} 
          />
        )}
      </div>

      {/* Data Count Per Study Chart */}
      <div id="data_count_per_study_chart" style={{ position: "relative", width: "60%", height: "400px", margin: "0px auto 50px auto" }}>
        {chartStates.dataCountPerStudy.loading ? (
          <div>Loading Number of Data per Study Chart...</div>
        ) : (
          <Chart type="bar" 
            data={chartStates.dataCountPerStudy.data} 
            options={chartOptions("Number of Data per Study")}
          />
        )}
      </div>

      <div id="mean_frequency_per_mismatch_chart" style={{ position: "relative", width: "60%", height: "500px", margin: "0px auto 50px auto" }}>
        {chartStates.meanFrequencyPerMismatch.loading ? (
          <div>Loading Mean Background Subtracted Indel Frequency vs Number of Mismatches Chart...</div>
        ) : (
          <Chart 
            type="line" 
            data={chartStates.meanFrequencyPerMismatch.data} 
            options={chartOptions("Mean Background Subtracted Indel Frequency vs Number of Mismatches")}
          />
        )}
      </div>

      {/* Mean Frequency vs Number of Mismatches for each Variant */}
      <div id="mean_frequency_per_variant_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 100px auto" }}>
        {chartStates.meanFrequencyPerVariant.loading ? (
          <div>Loading Mean Background Subtracted Indel Frequency vs Number of Mismatches for Each Variant Chart...</div>
        ) : (
            <Chart 
              type="line" 
              data={chartStates.meanFrequencyPerVariant.data} 
              options={chartOptions("Mean Background Subtracted Indel Frequency vs Number of Mismatches for Each Variant")}
            />
        )}
      </div>
    </div>
  );
};

export default Statistics;