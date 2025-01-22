import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title } from "chart.js";
import { BoxPlotController, BoxAndWiskers } from "@sgratzl/chartjs-chart-boxplot";
import { Chart } from "react-chartjs-2";

ChartJS.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

const Statistics = () => {
  const [chartStates, setChartStates] = useState({
    freqPerVariant: { data: null, loading: true },
    dataCountPerStudy: { data: null, loading: true },
  });

  // Fetch data function
  const fetchData = async (url) => {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching data from:", url, error);
      return null;
    }
  };

  // Process data for "Frequency Per Variant" chart
  const processFreqPerVariantData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const { variant, mean_background_subtracted_indel_frequency } = item;
      if (!acc[variant]) {
        acc[variant] = [];
      }
      acc[variant].push(mean_background_subtracted_indel_frequency);
      return acc;
    }, {});

    const labels = Object.keys(groupedData);
    const datasets = [
      {
        label: "Mean Background Subtracted Indel Frequency",
        data: Object.values(groupedData),
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ];

    return { labels, datasets };
  };

  // Process data for "Data Count Per Study" chart
  const processDataCountPerStudy = (data) => {
    const studyCounts = data.reduce((acc, item) => {
      const { study } = item;
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

  // Load and process data for charts
  const loadChartData = async () => {
    const url = "http://localhost:5000/statistics";
    const rawData = await fetchData(url);

    if (rawData) {
      setChartStates((prevState) => ({
        ...prevState,
        freqPerVariant: { data: processFreqPerVariantData(rawData), loading: false },
        dataCountPerStudy: { data: processDataCountPerStudy(rawData), loading: false },
      }));
    } else {
      setChartStates((prevState) => ({
        ...prevState,
        freqPerVariant: { ...prevState.freqPerVariant, loading: false },
        dataCountPerStudy: { ...prevState.dataCountPerStudy, loading: false },
      }));
    }
  };

  useEffect(() => {
    loadChartData();
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
          <div>Loading Frequency Per Variant Chart...</div>
        ) : (
          <Chart type="boxplot" data={chartStates.freqPerVariant.data} options={chartOptions("Mean Background Subtracted Indel Frequency per Variant")} />
        )}
      </div>

      {/* Data Count Per Study Chart */}
      <div id="data_count_per_study_chart" style={{ position: "relative", width: "60%", height: "400px", margin: "0px auto 100px auto" }}>
        {chartStates.dataCountPerStudy.loading ? (
          <div>Loading Data Count Per Study Chart...</div>
        ) : (
          <Chart type="bar" data={chartStates.dataCountPerStudy.data} options={chartOptions("Number of Data per Study")} />
        )}
      </div>
    </div>
  );
};

export default Statistics;
