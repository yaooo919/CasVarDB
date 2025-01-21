import React, { useEffect, useState } from "react";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale, Tooltip, Legend, Title } from "chart.js";
import { BoxPlotController, BoxAndWiskers } from "@sgratzl/chartjs-chart-boxplot";
import { Chart } from "react-chartjs-2";

ChartJS.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, Tooltip, Legend, Title);

const Statistics = () => {
  const [chartData, setChartData] = useState(null);

  const fetchData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/statistics");
      const data = response.data;

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

      setChartData({ labels, datasets });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!chartData) return <div>Loading...</div>;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "Mean Background Subtracted Indel Frequency per Variant",
        font: {
          size: 16,
          weight: "bold",
        },
        padding: {
          top: 10,
          bottom: 10,
        },
      },
    },
  };

  return (
    <div>
      <div className="header-container">
          <div className="header">
              <h1>Statistics</h1>
          </div>
      </div>
      <div id="boxplot_chart" style={{ position: "relative", width: "95%", height: "600px", margin: "0px auto 100px auto" }}>
        <Chart type="boxplot" data={chartData} options={options}/>
      </div>
    </div>
  );
};

export default Statistics;
