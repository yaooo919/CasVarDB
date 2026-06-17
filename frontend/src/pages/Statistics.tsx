import React, { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale,  BarElement, LineElement, PointElement, Tooltip, Legend, Title } from "chart.js";
import { BoxPlotController, BoxAndWiskers } from "@sgratzl/chartjs-chart-boxplot";
import { Chart } from "react-chartjs-2";
import Heatmap from "react-heatmap-grid";
import { getQueuedResult, QueuedRequestStatusUpdate } from "../api/queuedRequest";
import QueueNotice from "../components/QueueNotice";
import "./Statistics.css";

ChartJS.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title);

type ChartState = {
  data: any | null;
  loading: boolean;
};

type SummaryStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
};

type SummaryStatsResponse = Record<string, SummaryStats>;
type StudyCountResponse = Record<string, number>;
type MismatchFrequencyResponse = Record<string, number>;
type VariantMismatchResponse = Array<Record<string, number | string>>;
type HeatmapResponse = Record<string, Record<string, { raw: number; normalized: number }>>;
type ColorLegendProps = { min: number; max: number };

const Statistics = () => {
  const BASE_URL = `${process.env.REACT_APP_API_URL}`;
  const [isNormalized, setIsNormalized] = useState(false);
  const [queuedRequests, setQueuedRequests] = useState<Record<string, QueuedRequestStatusUpdate["status"]>>({});

  const [chartStates, setChartStates] = useState({
    freqPerCas9Variant: { data: null, loading: true },
    freqPerCas12Variant: { data: null, loading: true },
    freqPerScaffold: { data: null, loading: true },
    dataCountPerStudy: { data: null, loading: true },
    cas9FreqPerMismatch: { data: null, loading: true },
    cas12FreqPerMismatch: { data: null, loading: true },
    freqMismatchPerVariant: { data: null, loading: true },
    heatmapData: { data: null, loading: true }
  });

  const handleQueuedRequestStatus = ({ id, status }: QueuedRequestStatusUpdate) => {
    setQueuedRequests((prev) => {
      const next = { ...prev };

      if (status === "completed" || status === "failed") {
        delete next[id];
        return next;
      }

      next[id] = status;
      return next;
    });
  };

  const queuedRequestOptions = { onStatusChange: handleQueuedRequestStatus };
  const hasQueuedRequests = Object.keys(queuedRequests).length > 0;

  const fetchFreqPerCas9Variant = async () => {
    try {
      const statsByVariant = await getQueuedResult<SummaryStatsResponse>(
        `${BASE_URL}/statistics/cas9-freq-per-variant`,
        undefined,
        queuedRequestOptions
      );
      setChartStates((prev) => ({
        ...prev,
        freqPerCas9Variant: { data: {
          labels: Object.keys(statsByVariant)
            .map(variant => ({
              variant,
              median: statsByVariant[variant].median
            }))
            .sort((a, b) => b.median - a.median)
            .map(item => item.variant),
          datasets: [
            {
              label: "Mean Background Subtracted Indel Frequency",
              data: Object.entries(statsByVariant)
                .map(([variant, stats]) => ({
                  x: variant,
                  min: stats.min,
                  max: stats.max,
                  mean: stats.mean,
                  median: stats.median,
                  q1: stats.q1,
                  q3: stats.q3
                }))
                .sort((a, b) => b.median - a.median),
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1
            }
          ]
        }, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching freqPerCas9Variant data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqPerCas9Variant: { data: null, loading: false }
      }));
    }
  };

  const fetchFreqPerCas12Variant = async () => {
    try {
      const statsByVariant = await getQueuedResult<SummaryStatsResponse>(
        `${BASE_URL}/statistics/cas12-freq-per-variant`,
        undefined,
        queuedRequestOptions
      );
      setChartStates((prev) => ({
        ...prev,
        freqPerCas12Variant: { data: {
          labels: Object.keys(statsByVariant)
            .map(variant => ({
              variant,
              median: statsByVariant[variant].median
            }))
            .sort((a, b) => b.median - a.median)
            .map(item => item.variant),
          datasets: [
            {
              label: "Mean Background Subtracted Indel Frequency",
              data: Object.entries(statsByVariant)
                .map(([variant, stats]) => ({
                  x: variant,
                  min: stats.min,
                  max: stats.max,
                  mean: stats.mean,
                  median: stats.median,
                  q1: stats.q1,
                  q3: stats.q3
                }))
                .sort((a, b) => b.median - a.median),
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1
            }
          ]
        }, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching freqPerCas12Variant data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqPerCas12Variant: { data: null, loading: false }
      }));
    }
  };

  const fetchFreqPerScaffold = async () => {
    try {
      const statsByScaffold = await getQueuedResult<SummaryStatsResponse>(
        `${BASE_URL}/statistics/freq-per-scaffold`,
        undefined,
        queuedRequestOptions
      );
      setChartStates((prev) => ({
        ...prev,
        freqPerScaffold: { data: {
          labels: Object.keys(statsByScaffold)
            .map(gRNA_scaffold => ({
              gRNA_scaffold,
              median: statsByScaffold[gRNA_scaffold].median
            }))
            .sort((a, b) => b.median - a.median)
            .map(item => item.gRNA_scaffold),
          datasets: [
            {
              label: "Mean Background Subtracted Indel Frequency",
              data: Object.entries(statsByScaffold)
                .map(([gRNA_scaffold, stats]) => ({
                  x: gRNA_scaffold,
                  min: stats.min,
                  max: stats.max,
                  mean: stats.mean,
                  median: stats.median,
                  q1: stats.q1,
                  q3: stats.q3
                }))
                .sort((a, b) => b.median - a.median),
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1
            }
          ]
        }, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching freqPerScaffold data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqPerScaffold: { data: null, loading: false }
      }));
    }
  };

  const fetchDataCountPerStudy = async () => {
    try {
      const studyCounts = await getQueuedResult<StudyCountResponse>(
        `${BASE_URL}/statistics/data-count-per-study`,
        undefined,
        queuedRequestOptions
      );
      const labels = Object.keys(studyCounts);
      const data = Object.values(studyCounts);
      setChartStates((prev) => ({
        ...prev,
        dataCountPerStudy: { data: {
          labels,
          datasets: [
            {
              label: "Number of Data per Study",
              data,
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1
            }
          ]
        }, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching dataCountPerStudy data:", error);
      setChartStates((prev) => ({
        ...prev,
        dataCountPerStudy: { data: null, loading: false }
      }));
    }
  };

  const fetchCas9FreqPerMismatch = async () => {
    try {
      const mismatchFrequency = await getQueuedResult<MismatchFrequencyResponse>(
        `${BASE_URL}/statistics/cas9-freq-per-mismatch`,
        undefined,
        queuedRequestOptions
      );
      const labels = Object.keys(mismatchFrequency);
      const data = Object.values(mismatchFrequency);

      setChartStates((prev) => ({
        ...prev,
        cas9FreqPerMismatch: { data: {
          labels,
          datasets: [
            {
              label: "Mean Background Subtracted Indel Frequency vs Number of Mismatches (for Cas9)",
              data: labels.map((key, index) => ({
                x: parseFloat(key),
                y: data[index]
              })),
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
              fill: false,
              tension: 0.1
            }
          ]
        }, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching cas9FreqPerMismatch data:", error);
      setChartStates((prev) => ({
        ...prev,
        cas9FreqPerMismatch: { data: null, loading: false }
      }));
    }
  };

  const fetchCas12FreqPerMismatch = async () => {
    try {
      const mismatchFrequency = await getQueuedResult<MismatchFrequencyResponse>(
        `${BASE_URL}/statistics/cas12-freq-per-mismatch`,
        undefined,
        queuedRequestOptions
      );
      const labels = Object.keys(mismatchFrequency);
      const data = Object.values(mismatchFrequency);

      setChartStates((prev) => ({
        ...prev,
        cas12FreqPerMismatch: { data: {
          labels,
          datasets: [
            {
              label: "Mean Background Subtracted Indel Frequency vs Number of Mismatches (for Cas12)",
              data: labels.map((key, index) => ({
                x: parseFloat(key),
                y: data[index]
              })),
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
              fill: false,
              tension: 0.1
            }
          ]
        }, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching cas12FreqPerMismatch data:", error);
      setChartStates((prev) => ({
        ...prev,
        cas12FreqPerMismatch: { data: null, loading: false }
      }));
    }
  };

  const fetchFreqMismatchPerVariant = async () => {
    try {
      const freqMismatchPerVariant = await getQueuedResult<VariantMismatchResponse>(
        `${BASE_URL}/statistics/freq-mismatch-per-variant`,
        undefined,
        queuedRequestOptions
      );
      setChartStates((prev) => ({
        ...prev,
        freqMismatchPerVariant: { data: {
          labels: [0, 1, 2, 3, 4],
          datasets: freqMismatchPerVariant.map((variantData) => ({
            label: variantData.variant,
            data: Object.keys(variantData)
              .filter((key) => key !== "variant")  // Exclude the variant key
              .map((key) => ({
                x: parseInt(key),  // mismatch count (0, 1, 3, 4)
                y: variantData[key] // frequency value
              })),
            borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // random color
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderWidth: 1,
            fill: false,
            tension: 0.1
          }))
        }, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching freqMismatchPerVariant data:", error);
      setChartStates((prev) => ({
        ...prev,
        freqMismatchPerVariant: { data: null, loading: false }
      }));
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const heatmapData = await getQueuedResult<HeatmapResponse>(
        `${BASE_URL}/statistics/heatmap-data`,
        undefined,
        queuedRequestOptions
      );

      setChartStates((prev) => ({
        ...prev,
        heatmapData: { data: heatmapData, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching heatmap data:", error);
      setChartStates((prev) => ({
        ...prev,
        heatmapData: { data: null, loading: false }
      }));
    }
  };

  useEffect(() => {
    fetchFreqPerCas9Variant();
    fetchFreqPerCas12Variant();
    fetchFreqPerScaffold();
    fetchDataCountPerStudy();
    fetchCas9FreqPerMismatch();
    fetchCas12FreqPerMismatch();
    fetchFreqMismatchPerVariant();
    fetchHeatmapData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartOptions = (title: string): any => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: "bold" },
        padding: { top: 10, bottom: 10 }
      },
      tooltip: {
        enabled: true,
        mode: "nearest",
        intersect: false
      },
      legend: {
        labels: {
          usePointStyle: true,
          pointStyle: "rect",
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
    }
  });

  /* functions for heatmap graph */
  const ColorLegend = ({ min, max }: ColorLegendProps) => {
    return (
      <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
        <div
          style={{
            width: "20px",
            height: "200px",
            background: "linear-gradient(to bottom, rgba(0, 151, 230, 1), rgba(0, 151, 230, 0))",
            marginRight: "10px"
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
    const positions = Array.from({ length: 23 }, (_, i) => i + 1);

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
      maxValue
    };
  };

  const heatmapDataForMismatch = getHeatmapDataForMismatch();

  const renderChart = (
    chartState: ChartState,
    loadingMessage: string,
    emptyMessage: string,
    type: "bar" | "boxplot" | "line",
    title: string
  ) => {
    if (chartState.loading) {
      return <div>{loadingMessage}</div>;
    }

    if (!chartState.data) {
      return <div>{emptyMessage}</div>;
    }

    return (
      <Chart
        type={type}
        data={chartState.data}
        options={chartOptions(title)}
      />
    );
  };

  return (
    <div>
      <div className="header-container">
        <div className="header">
          <h1>Statistics</h1>
        </div>
      </div>

      {hasQueuedRequests && <QueueNotice />}

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
                yLabels={heatmapDataForMismatch.variants.map(v => v === "AsCas12a-NLS-P2A" ? <span>AsCas12a-NLS-P2A<sup>†</sup></span> : v)}
                data={heatmapDataForMismatch.data}
                xLabelWidth={50}
                yLabelWidth={200}
                xLabelsLocation="bottom"
                cellStyle={(background, value, min, max, data, x, y) => ({
                  background: `rgb(0, 151, 230, ${1 - (max - value) / (max - min)})`,
                  fontSize: "11px",
                  color: "#444"
                })}
                labelStyle={{ fontSize: "5px" }}
                cellRender={(value) => value && value.toFixed(2)}
              />
              <div style={{
                textAlign: "left",
                fontSize: "12px",
                color: "#666",
                fontStyle: "italic",
                padding: "10px 0px 10px 220px"
              }}>
                * These numbers represent mismatch positions counted from the start of the raw spacer sequence (numbered starting from 1)<br />
                <sup>†</sup> indicates data from Cas12
              </div>
            </div>

            <div id="heatmap-right">
              <ColorLegend min={heatmapDataForMismatch.minValue} max={heatmapDataForMismatch.maxValue} />
              {/* <p id="PAM">PAM</p> */}
            </div>

          </div>
        ) : (
          <div>No heatmap data available.</div>
        )}
      </div>

      <div id="freq_per_variant_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 50px auto" }}>
        {renderChart(
          chartStates.freqPerCas9Variant,
          "Loading Mean Background Subtracted Indel Frequency per Cas9 Variant Chart...",
          "No Cas9 variant frequency data available.",
          "boxplot",
          "Mean Background Subtracted Indel Frequency per Cas9 Variant"
        )}
      </div>

      <div id="freq_per_variant_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 50px auto" }}>
        {renderChart(
          chartStates.freqPerCas12Variant,
          "Loading Mean Background Subtracted Indel Frequency per Cas12 Variant Chart...",
          "No Cas12 variant frequency data available.",
          "boxplot",
          "Mean Background Subtracted Indel Frequency per Cas12 Variant"
        )}
      </div>

      <div id="freq_per_scaffold_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 50px auto" }}>
        {renderChart(
          chartStates.freqPerScaffold,
          "Loading Mean Background Subtracted Indel Frequency per gRNA Scaffold Chart...",
          "No gRNA scaffold frequency data available.",
          "boxplot",
          "Mean Background Subtracted Indel Frequency per gRNA Scaffold"
        )}
      </div>

      <div id="data_count_per_study_chart" style={{ position: "relative", width: "60%", height: "400px", margin: "0px auto 50px auto" }}>
        {renderChart(
          chartStates.dataCountPerStudy,
          "Loading Number of Data per Study Chart...",
          "No study count data available.",
          "bar",
          "Number of Data per Study"
        )}
      </div>

      <div id="freq_per_mismatch_chart" style={{ position: "relative", width: "60%", height: "500px", margin: "0px auto 100px auto" }}>
        {renderChart(
          chartStates.cas9FreqPerMismatch,
          "Loading Mean Background Subtracted Indel Frequency vs Number of Mismatches (for Cas9) Chart...",
          "No Cas9 mismatch frequency data available.",
          "line",
          "Mean Background Subtracted Indel Frequency vs Number of Mismatches (for Cas9)"
        )}
      </div>

      <div id="freq_per_mismatch_chart" style={{ position: "relative", width: "60%", height: "500px", margin: "0px auto 100px auto" }}>
        {renderChart(
          chartStates.cas12FreqPerMismatch,
          "Loading Mean Background Subtracted Indel Frequency vs Number of Mismatches (for Cas12) Chart...",
          "No Cas12 mismatch frequency data available.",
          "line",
          "Mean Background Subtracted Indel Frequency vs Number of Mismatches (for Cas12)"
        )}
      </div>

      <div id="freq_mismatch_per_variant_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 50px auto" }}>
        {renderChart(
          chartStates.freqMismatchPerVariant,
          "Loading Mean Background Subtracted Indel Frequency vs Number of Mismatches for Each Variant Chart...",
          "No variant mismatch frequency data available.",
          "line",
          "Mean Background Subtracted Indel Frequency vs Number of Mismatches for Each Variant"
        )}
      </div>
    </div>
  );
};

export default Statistics;
