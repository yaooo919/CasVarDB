import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale,  BarElement, LineElement, PointElement, Tooltip, Legend, Title } from "chart.js";
import { BoxPlotController, BoxAndWiskers } from "@sgratzl/chartjs-chart-boxplot";
import { Chart } from "react-chartjs-2";
import Heatmap from 'react-heatmap-grid';
import './Statistics.css';

ChartJS.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title);

const Statistics = () => {
  const BASE_URL = "http://localhost:5000";
  const [isNormalized, setIsNormalized] = useState(false);
  
  const [chartStates, setChartStates] = useState({
    freqPerVariant: { data: null, loading: true },
    freqPerScaffold: { data: null, loading: true },
    dataCountPerStudy: { data: null, loading: true },
    freqPerMismatch: { data: null, loading: true },
    freqMismatchPerVariant: { data: null, loading: true },
    heatmapData: { data: null, loading: true },
  });

  const fetchFreqPerVariant = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/statistics/freq-per-variant`);
      setChartStates((prev) => ({
        ...prev,
        freqPerVariant: { data: response.data, loading: false },
      }));
    } catch (error) {
      console.error("Error fetching freqPerVariant data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqPerVariant: { data: null, loading: false },
      }));
    }
  };
  
  const fetchFreqPerScaffold = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/statistics/freq-per-scaffold`);
      setChartStates((prev) => ({
        ...prev,
        freqPerScaffold: { data: response.data, loading: false },
      }));
    } catch (error) {
      console.error("Error fetching freqPerScaffold data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqPerScaffold: { data: null, loading: false },
      }));
    }
  };
  
  const fetchDataCountPerStudy = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/statistics/data-count-per-study`);
      setChartStates((prev) => ({
        ...prev,
        dataCountPerStudy: { data: response.data, loading: false },
      }));
    } catch (error) {
      console.error("Error fetching dataCountPerStudy data:", error);
      setChartStates((prev) => ({
        ...prev,
        dataCountPerStudy: { data: null, loading: false },
      }));
    }
  };
  
  const fetchFreqPerMismatch = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/statistics/freq-per-mismatch`);
      setChartStates((prev) => ({
        ...prev,
        freqPerMismatch: { data: response.data, loading: false },
      }));
    } catch (error) {
      console.error("Error fetching freqPerMismatch data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqPerMismatch: { data: null, loading: false },
      }));
    }
  };
  
  const fetchFreqMismatchPerVariant = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/statistics/freq-mismatch-per-variant`);
      setChartStates((prev) => ({
        ...prev,
        freqMismatchPerVariant: { data: response.data, loading: false },
      }));
    } catch (error) {
      console.error("Error fetching freqMismatchPerVariant data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqMismatchPerVariant: { data: null, loading: false },
      }));
    }
  };
  
  const fetchHeatmapData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/statistics/heatmap-data`);

      setChartStates((prev) => ({
        ...prev,
        heatmapData: { data: response.data, loading: false },
      }));
    } catch (error) {
      console.error("Error fetching heatmap data:", error);
      setChartStates((prev) => ({
        ...prev,
        heatmapData: { data: null, loading: false },
      }));
    }
  };

  useEffect(() => {
    fetchFreqPerVariant();
    fetchFreqPerScaffold();
    fetchDataCountPerStudy();
    fetchFreqPerMismatch();
    fetchFreqMismatchPerVariant();
    fetchHeatmapData();
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

  const ColorLegend = ({ min, max }) => {
    return (
      <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
        <div
          style={{
            width: "20px",
            height: "200px",
            background: "linear-gradient(to bottom, rgba(0, 151, 230, 1), rgba(0, 151, 230, 0))",
            marginRight: "10px",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "200px" }}>
          <span>{max.toFixed(2)}</span>
          <span>{min.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  const getHeatmapDataForMismatch = () => {
    const heatmapData = chartStates.heatmapData.data;
    if (!heatmapData) return null;

    const variants = Object.keys(heatmapData);
    const positions = Array.from({ length: 25 }, (_, i) => i + 1);
  
    const data = variants.map((variant) =>
       positions.map((pos) => {
        const value = heatmapData[variant][pos];
        if (!value) return 0;
        return isNormalized ? value.normalized : value.raw;
       })
    );

    const flatData = data.flat();
    const minValue = Math.min(...flatData);
    const maxValue = Math.max(...flatData);
  
    return {
      positions,
      variants,
      data,
      minValue,
      maxValue,
    };
  };

  const heatmapDataForMismatch = getHeatmapDataForMismatch();
  return (
    <div>
      <div className="header-container">
        <div className="header">
          <h1>Statistics</h1>
        </div>
      </div>

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

      <div id="freq_per_mismatch_chart" style={{ position: "relative", width: "60%", height: "500px", margin: "0px auto 50px auto" }}>
        {chartStates.freqPerMismatch.loading ? (
          <div>Loading Mean Background Subtracted Indel Frequency vs Number of Mismatches Chart...</div>
        ) : (
          <Chart 
            type="line" 
            data={chartStates.freqPerMismatch.data} 
            options={chartOptions("Mean Background Subtracted Indel Frequency vs Number of Mismatches")}
          />
        )}
      </div>
  
      <div id="freq_mismatch_per_variant_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 50px auto" }}>
        {chartStates.freqMismatchPerVariant.loading ? (
          <div>Loading Mean Background Subtracted Indel Frequency vs Number of Mismatches for Each Variant Chart...</div>
        ) : (
            <Chart 
              type="line" 
              data={chartStates.freqMismatchPerVariant.data} 
              options={chartOptions("Mean Background Subtracted Indel Frequency vs Number of Mismatches for Each Variant")}
            />
        )}
      </div>
  
      <div id="heatmap" style={{ position: "relative", width: "95%", margin: "0px auto 100px auto" }}>
        {chartStates.heatmapData.loading ? (
          <div>Loading Heatmap...</div>
        ) : heatmapDataForMismatch ? (
          <div id="heatmap-container">
            <div id="heatmap-left">
              <div style={{ marginBottom: "10px", marginLeft: "20px", fontSize: "14px" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={isNormalized}
                    onChange={(e) => setIsNormalized(e.target.checked)}
                  />
                  Normalize relative to on-target activity
                </label>
              </div>
              <Heatmap
                xLabels={heatmapDataForMismatch.positions}
                yLabels={heatmapDataForMismatch.variants}
                data={heatmapDataForMismatch.data}
                xLabelWidth={50}
                yLabelWidth={200}
                xLabelsLocation="bottom"
                cellStyle={(background, value, min, max, data, x, y) => ({
                  background: `rgb(0, 151, 230, ${1 - (max - value) / (max - min)})`,
                  fontSize: "11px",
                  color: "#444",
                })}
                labelStyle={{ fontSize: "5px" }}
                cellRender={(value) => value && value.toFixed(2)}
              />
            </div>

            <div id="heatmap-right">
              <ColorLegend min={heatmapDataForMismatch.minValue} max={heatmapDataForMismatch.maxValue}/>
              <p id="PAM">PAM</p>
            </div>
            
          </div>
        ) : (
          <div>No heatmap data available.</div>
        )}
      </div>
      
    </div>
  );
};



export default Statistics;