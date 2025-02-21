import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale,  BarElement, LineElement, PointElement, Tooltip, Legend, Title } from "chart.js";
import { BoxPlotController, BoxAndWiskers } from "@sgratzl/chartjs-chart-boxplot";
import { Chart } from "react-chartjs-2";
import Heatmap from 'react-heatmap-grid';
import { density1d } from 'fast-kde';
import './Statistics.css';

ChartJS.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title);

const Statistics = () => {
  const BASE_URL = "http://localhost:5000";
  const [isNormalized, setIsNormalized] = useState(false);

  const options = {
    pams: ["NGG", "NNGG", "NNGRRT", "NNNRRT"],
    mismatches: [0, 1, 2, 3, 4],
    variants: ["SpCas9-NLS-FLAG-P2A", "SpCas9-HF1-NLS-FLAG-P2A", "eSpCas9(1.1)-NLS-FLAG-P2A", "Sniper-Cas9-NLS-FLAG-P2A",
       "Sniper2L-NLS-FLAG-P2A", "Sniper2P-NLS-FLAG-P2A", "HypaCas9-NLS-FLAG-P2A", "evoCas9-NLS-FLAG-P2A",
       "xCas9-NLS-FLAG-P2A", "NLS-St1Cas9-NLS-FLAG-P2A", "NLS-SaCas9*-NLS-FLAG-P2A", "NLS-SauriCas9-NLS-FLAG-P2A",
       "NLS-CjCas9-NLS-FLAG-P2A", "NLS-Nm2Cas9-NLS-FLAG-P2A", "NLS-Nm1Cas9-NLS-FLAG-P2A", "NLS-SaCas9-KKH-NLS-FLAG-P2A",
       "NLS-SaCas9-NLS-FLAG-P2A", "SpCas9-NG-NLS-FLAG-P2A", "VRQR-NLS-FLAG-P2A", "NLS-SpCas9-NLS-FLAG-P2A",
       "NLS-enCjCas9-NLS-FLAG-P2A", "NLS-Sa-SlugCas9-NLS-FLAG-P2A", "NLS-SaCas9-HF-NLS-FLAG-P2A", "NLS-SaCas9-KKH-HF-NLS-FLAG-P2A",
       "NLS-SauriCas9-KKH-NLS-FLAG-P2A", "NLS-SlugCas9-HF-NLS-FLAG-P2A", "NLS-SlugCas9-NLS-FLAG-P2A", "NLS-eSaCas9-NLS-FLAG-P2A",
       "NLS-efSaCas9-NLS-FLAG-P2A", "NLS-sRGN3.1-NLS-FLAG-P2A", "QQR1-NLS-FLAG-P2A", "Sc++-NLS-FLAG-P2A",
       "SpCas9-NRCH-NLS-FLAG-P2A", "SpCas9-NRRH-NLS-FLAG-P2A", "SpCas9-NRTH-NLS-FLAG-P2A", "SpG-NLS-FLAG-P2A",
       "SpRY-NLS-FLAG-P2A", "VQR-NLS-FLAG-P2A", "VRER-NLS-FLAG-P2A", "VRQR-HF1-NLS-FLAG-P2A"],
  };

  const [selectedPam, setSelectedPam] = useState("");
  const [selectedMismatches, setSelectedMismatches] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [activityGraphs, setActivityGraphs] = useState([]); // store individual graphs
  const [isActivityGraphLoading, setIsActivityGraphLoading] = useState(false);
  const [isFirstGraphGenerated, setIsFirstGraphGenerated] = useState(false);
  
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

  const handleGenerateGraph = async () => {
    if (!selectedPam || selectedMismatches === '' || !selectedVariant) {
      alert("Please select PAM, number of mismatches, and variant.");
      return;
    }

    setIsActivityGraphLoading(true);

    try {
      const response = await axios.get(`${BASE_URL}/statistics/activity-graph`, {
        params: {
          pam: selectedPam,
          numberOfMismatches: selectedMismatches,
          variant: selectedVariant,
        },
      });

      if (!response.data.frequencies || response.data.frequencies.length === 0) {
        alert("No data available for the selected parameters.");
        return;
      }

      const newGraph = {
        id: Date.now(),
        pam: selectedPam,
        mismatches: selectedMismatches,
        variant: selectedVariant,
        data: response.data.frequencies,
        datapoints: response.data.datapoints,
      };

      setActivityGraphs(prev => [...prev, newGraph]);
      setIsFirstGraphGenerated(true);
    } catch (error) {
      console.error("Error in fetching data:", error);
    } finally {
      setIsActivityGraphLoading(false);
    }
  };

  // const handleGenerateGraph = async () => {
  //   if (!selectedPam || !selectedMismatches || !selectedVariant) {
  //     alert("Please select PAM, number of mismatches, and variant.");
  //     return;
  //   }
  
  //   setIsActivityGraphLoading(true);
  
  //   try {
  //     const mockResponse = {
  //       frequencies: Array.from({ length: 50 }, () => Math.random()),
  //       datapoints: 50,
  //     };
  
  //     const newGraph = {
  //       id: Date.now(),
  //       pam: selectedPam,
  //       mismatches: selectedMismatches,
  //       variant: selectedVariant,
  //       data: mockResponse.frequencies,
  //       datapoints: mockResponse.datapoints,
  //     };
  
  //     setActivityGraphs(prev => [...prev, newGraph]);
  //     setIsFirstGraphGenerated(true);
  //   } catch (error) {
  //     console.error("Error in fetching data:", error);
  //   } finally {
  //     setIsActivityGraphLoading(false);
  //   }
  // };
  

  const handleClearGraphs = () => {
    setActivityGraphs([]);
    setIsFirstGraphGenerated(false);
  }

  const calculateDensity = (data) => {
    const bandwidth = 0.2;
    const d1 = density1d(data, { bandwidth });
    const points = Array.from(d1);
    return points;
  };

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
  
      <div id="heatmap" style={{ position: "relative", width: "95%", margin: "0px auto 50px auto" }}>
        <h4 style={{ textAlign: "center", color: "#444" }}>Mean Background Subtracted Intel Frequency Heatmap for Single Mismatch</h4>
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

      <div style={{ position: "relative", width: "95%", margin: "0px auto 100px auto" }}>
        <h4 style={{ textAlign: "center", color: "#444" }}>Mean Background Subtracted Indel Frequency Distribution</h4>
        <div className="input-group">
          <label>
            PAM: 
            <select
              value={selectedPam}
              onChange={(e) => setSelectedPam(e.target.value)}
            >
              <option value="">Select PAM</option>
              {options.pams.map((pam, index) => (
                <option key={index} value={pam}>
                  {pam}
                </option>
              ))}
            </select>
          </label>
          <label>
            Number of mismatches:
            <select
              value={selectedMismatches}
              onChange={(e) => setSelectedMismatches(Number(e.target.value))}
            >
              {options.mismatches.map((mismatch, index) => (
                <option key={index} value={mismatch}>
                  {mismatch}
                </option>
              ))}
            </select>
          </label>
          <label>
            Variant:
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
            >
              <option value="">Select variant</option>
              {options.variants.map((variant, index) => (
                <option key={index} value={variant}>
                  {variant}
                </option>
              ))}
            </select>
          </label>

          <div className="button-group">
            <button onClick={handleGenerateGraph}>{isFirstGraphGenerated ? "Add More" : "Generate"}</button>
            {isFirstGraphGenerated && (
              <button onClick={handleClearGraphs}>Clear</button>
            )}
          </div>
        </div>

        <div className="graph-container">
          {!isActivityGraphLoading && activityGraphs.length === 0 && (
            <div style={{ textAlign: "center", color: "#666" }}>There is no chart yet. Select the parameters and click Generate.</div>
          )}

          {activityGraphs.map(graph => (
            <div key={graph.id} style={{ width: "49%", border: "1px solid #ddd" }}>
              <h5 style={{ textAlign: "center", margin: "5px 0px" }}>
                <span>PAM:</span> <span style={{ fontWeight: "normal" }}>{graph.pam}</span> |
                <span> Number of mismatches:</span> <span style={{ fontWeight: "normal" }}>{graph.mismatches}</span> |
                <span> Variant:</span> <span style={{ fontWeight: "normal" }}>{graph.variant}</span>  
              </h5>
              <h5 style={{ textAlign: "center", margin: "0px"}}>
                <span>Number of datapoints:</span> <span style={{ fontWeight: "normal" }}>{graph.datapoints}</span>
              </h5>
              <div style={{ height: "400px" }}>
                <Chart
                  type="line"
                  data={{
                    datasets: [
                      {
                        label: `density`,
                        data: calculateDensity(graph.data),
                        borderColor: "#4bc0c0",
                        backgroundColor: "rgba(75, 192, 192, 0.2)",
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: true
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { type: 'linear', title: { display: true, text: "Mean Background Subtracted Indel Frequency" } },
                      y: { title: { display: true, text: "Density" }, beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>
          ))}

          {isActivityGraphLoading && (
            <div style={{ textAlign: "center", margin: "20px 0", color: "#666" }}>
              <div className="loading-spinner"></div>
              <p>Generating graph, please wait...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



export default Statistics;