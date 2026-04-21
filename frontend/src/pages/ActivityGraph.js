import React, { useState } from "react";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale,  BarElement, LineElement, PointElement, Tooltip, Legend, Title } from "chart.js";
import { BoxPlotController, BoxAndWiskers } from "@sgratzl/chartjs-chart-boxplot";
import { Chart } from "react-chartjs-2";
import { density1d } from 'fast-kde';
import './ActivityGraph.css'
import sidebarRight from '../assets/sidebar-right.png';
import sidebarLeft from '../assets/sidebar-left.png';

ChartJS.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title);

const ActivityGraph = () => {
    const BASE_URL = `${process.env.REACT_APP_API_URL}`;

    const options = {
        pams: ["NGG", "NNGG", "NNGRRT", "NNNRRT", "TTTV"],
        mismatches: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        variants: ["SpCas9-NLS-FLAG-P2A", "SpCas9-HF1-NLS-FLAG-P2A", "eSpCas9(1.1)-NLS-FLAG-P2A", "Sniper-Cas9-NLS-FLAG-P2A",
            "Sniper2L-NLS-FLAG-P2A", "Sniper2P-NLS-FLAG-P2A", "HypaCas9-NLS-FLAG-P2A", "evoCas9-NLS-FLAG-P2A",
            "xCas9-NLS-FLAG-P2A", "NLS-St1Cas9-NLS-FLAG-P2A", "NLS-SaCas9*-NLS-FLAG-P2A", "NLS-SauriCas9-NLS-FLAG-P2A",
            "NLS-CjCas9-NLS-FLAG-P2A", "NLS-Nm2Cas9-NLS-FLAG-P2A", "NLS-Nm1Cas9-NLS-FLAG-P2A", "NLS-SaCas9-KKH-NLS-FLAG-P2A",
            "NLS-SaCas9-NLS-FLAG-P2A", "SpCas9-NG-NLS-FLAG-P2A", "VRQR-NLS-FLAG-P2A", "NLS-SpCas9-NLS-FLAG-P2A",
            "NLS-enCjCas9-NLS-FLAG-P2A", "NLS-Sa-SlugCas9-NLS-FLAG-P2A", "NLS-SaCas9-HF-NLS-FLAG-P2A", "NLS-SaCas9-KKH-HF-NLS-FLAG-P2A",
            "NLS-SauriCas9-KKH-NLS-FLAG-P2A", "NLS-SlugCas9-HF-NLS-FLAG-P2A", "NLS-SlugCas9-NLS-FLAG-P2A", "NLS-eSaCas9-NLS-FLAG-P2A",
            "NLS-efSaCas9-NLS-FLAG-P2A", "NLS-sRGN3.1-NLS-FLAG-P2A", "QQR1-NLS-FLAG-P2A", "Sc++-NLS-FLAG-P2A",
            "SpCas9-NRCH-NLS-FLAG-P2A", "SpCas9-NRRH-NLS-FLAG-P2A", "SpCas9-NRTH-NLS-FLAG-P2A", "SpG-NLS-FLAG-P2A",
            "SpRY-NLS-FLAG-P2A", "VQR-NLS-FLAG-P2A", "VRER-NLS-FLAG-P2A", "VRQR-HF1-NLS-FLAG-P2A", "AsCas12a-NLS-P2A"],
    };

    const [parameterSets, setParameterSets] = useState([
        {
            id: 1,
            pam: "",
            mismatches: null,
            mismatchPosition: null,
            variant: ""
        }
    ]);
    const [activityGraphs, setActivityGraphs] = useState([]); // store individual graphs
    const [isActivityGraphLoading, setIsActivityGraphLoading] = useState(false);
    const [isFirstGraphGenerated, setIsFirstGraphGenerated] = useState(false);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

    const addParameterSet = () => {
        setParameterSets([...parameterSets, {
            id: Date.now(),
            pam: "",
            mismatches: null,
            mismatchPosition: null,
            variant: ""
        }]);
    };

    const removeParameterSet = (id) => {
        if (parameterSets.length > 1) {
            setParameterSets(parameterSets.filter(set => set.id !== id));
        }
    };

    const updateParameterSet = (id, field, value) => {
        setParameterSets(parameterSets.map(set =>
            set.id === id ? { ...set, [field]: value } : set
        ));
    };

    const formatParameterSetLabel = (set) => {
        return `Variant: ${set.variant}, PAM: ${set.pam}, Mismatches: ${set.mismatches}${
            set.mismatches === 1
                ? `, Position: ${set.mismatchPosition || 'All Positions'}`
                : ''
        }`;
    };

    const handleGenerateGraph = async () => {
        const incompleteSet = parameterSets.find(set =>
            !set.pam || set.mismatches === null || !set.variant
        );

        if (incompleteSet) {
            alert("Please complete all parameter sets before generating the graph.");
            return;
        }

        setIsActivityGraphLoading(true);

        try {
            const allData = await Promise.all(
                parameterSets.map(async (set) => {
                    const response = await axios.get(`${BASE_URL}/statistics/activity-graph`, {
                        params: {
                            pam: set.pam,
                            numberOfMismatches: set.mismatches,
                            variant: set.variant,
                            mismatchPosition:
                                set.mismatches === 1 && set.mismatchPosition
                                    ? `[${set.mismatchPosition}]`
                                    : undefined,
                        },
                    });

                    return response.data;
                })
            );

            const validEntries = [];
            const missingSets = [];

            parameterSets.forEach((set, i) => {
                const variantData = allData[i]?.[set.variant];

                if (!variantData || variantData.length === 0) {
                    missingSets.push(set);
                    return;
                }

                const densityData = calculateDensity(variantData);

                if (!densityData || densityData.length === 0) {
                    missingSets.push(set);
                    return;
                }

                const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

                validEntries.push({
                    parameterSet: set,
                    dataset: {
                        label: `${set.variant} (PAM: ${set.pam}, Mismatches: ${set.mismatches}${
                            set.mismatches === 1 && set.mismatchPosition ? `, Pos: ${set.mismatchPosition}` : ''
                        })`,
                        data: densityData,
                        borderColor: color,
                        backgroundColor: color,
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                    },
                });
            });

            if (missingSets.length > 0) {
                const missingSummary = missingSets
                    .map((set, index) => `${index + 1}. ${formatParameterSetLabel(set)}`)
                    .join('\n');

                const proceed = window.confirm(
                    `No data was found for the following parameter set(s):\n\n${missingSummary}\n\nDo you want to proceed with the remaining valid set(s)?`
                );

                if (!proceed) {
                    return;
                }
            }

            if (validEntries.length === 0) {
                alert("No valid data found for the selected parameters.");
                return;
            }

            const newGraph = {
                id: Date.now(),
                parameterSets: validEntries.map(entry => entry.parameterSet),
                datasets: validEntries.map(entry => entry.dataset),
            };

            setActivityGraphs(prev => [...prev, newGraph]);
            setIsFirstGraphGenerated(true);

            setParameterSets([{
                id: Date.now(),
                pam: "",
                mismatches: null,
                mismatchPosition: null,
                variant: ""
            }]);
        } catch (error) {
            console.error("Error in fetching data:", error);
            alert("Failed to fetch activity graph data.");
        } finally {
            setIsActivityGraphLoading(false);
        }
    };

    const handleClearGraphs = () => {
        setParameterSets([{
            id: Date.now(),
            pam: "",
            mismatches: null,
            mismatchPosition: null,
            variant: ""
        }]);
        setActivityGraphs([]);
        setIsActivityGraphLoading(false);
        setIsFirstGraphGenerated(false);
    };

    const calculateDensity = (data) => {
        if (!data || data.length === 0) {
            console.error("No data provided for density calculation");
            return [];
        }

        try {
            const bandwidth = 0.2;
            const d1 = density1d(data, { bandwidth });
            return Array.from(d1);
        } catch (error) {
            console.error("Error calculating density:", error);
            return [];
        }
    };

    const getSharedXAxisRange = () => {
        let minX = Infinity;
        let maxX = -Infinity;

        activityGraphs.forEach((graph) => {
            graph.datasets.forEach((dataset) => {
                dataset.data.forEach((point) => {
                    const x = typeof point === "number" ? point : point.x;

                    if (Number.isFinite(x)) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                    }
                });
            });
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
            return { min: undefined, max: undefined };
        }

        return {
            min: Math.floor(minX / 10) * 10,
            max: Math.ceil(maxX / 10) * 10,
        };
    };

    const togglePanel = () => {
        setIsPanelCollapsed(!isPanelCollapsed);
    };

    const sharedXAxisRange = getSharedXAxisRange();

    return (
        <div>
            <div className="header-container">
                <div className="header">
                    <h1>Statistics</h1>
                </div>
            </div>

            <div className="activity-graph-page">
                <div className={`parameter-panel ${isPanelCollapsed ? 'collapsed' : ''}`}>
                    <button
                        className={`panel-toggle ${isPanelCollapsed ? 'collapsed' : ''}`}
                        onClick={togglePanel}
                    >
                        <img
                            src={isPanelCollapsed ? sidebarRight : sidebarLeft}
                            alt={isPanelCollapsed ? "open sidebar" : "collapse sidebar"}
                            className="panel-toggle-icon"
                        />
                    </button>
                    <div className="panel-content">
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            <h3>Parameters</h3>
                            <button
                                className="add-parameter-btn"
                                onClick={addParameterSet}
                            >
                                <span>+</span>
                            </button>
                        </div>

                        <div className="parameter-sets-container">
                            {parameterSets.map((set, index) => (
                                <div key={set.id} className="parameter-set">
                                    {index > 0 && (
                                        <button
                                            className="remove-set-button"
                                            onClick={() => removeParameterSet(set.id)}
                                        >
                                            ×
                                        </button>
                                    )}

                                    <div className="select-wrapper">
                                        <label>PAM: </label>
                                        <select
                                            value={set.pam}
                                            onChange={(e) => updateParameterSet(set.id, 'pam', e.target.value)}
                                        >
                                            <option value="">Select PAM</option>
                                            {options.pams.map((pam, i) => (
                                                <option key={i} value={pam}>{pam}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="select-wrapper">
                                        <label>Number of Mismatches: </label>
                                        <select
                                            value={set.mismatches === null ? '' : set.mismatches}
                                            onChange={(e) => updateParameterSet(set.id, 'mismatches', Number(e.target.value))}
                                        >
                                            <option value="">Select Mismatches</option>
                                            {options.mismatches.map((mismatch, i) => (
                                                <option key={i} value={mismatch}>{mismatch}</option>
                                            ))}
                                        </select>
                                        <p className="note">
                                                *Only AsCas12a-NLS-P2A has number of mismatches &gt; 4
                                        </p>
                                    </div>

                                    {set.mismatches === 1 && (
                                        <div className="select-wrapper">
                                            <label>Mismatch Position: </label>
                                            <select
                                                value={set.mismatchPosition || ''}
                                                onChange={(e) => updateParameterSet(set.id, 'mismatchPosition', e.target.value)}
                                            >
                                                <option value="">All Positions</option>
                                                {Array.from({ length: 23 }, (_, i) => i + 1).map((pos) => (
                                                    <option key={pos} value={pos}>{pos}</option>
                                                ))}
                                            </select>
                                            <p className="note">
                                                *Mismatch position is the location of a mismatch counted from the start of the raw spacer sequence (numbered starting from 1)
                                            </p>
                                        </div>
                                    )}

                                    <div className="select-wrapper">
                                        <label>Variant: </label>
                                        <select
                                            value={set.variant}
                                            onChange={(e) => updateParameterSet(set.id, 'variant', e.target.value)}
                                        >
                                            <option value="">Select Variant</option>
                                            {options.variants.map((variant, i) => (
                                                <option key={i} value={variant}>{variant}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="panel-actions">
                            <button
                                onClick={handleGenerateGraph}
                                disabled={isActivityGraphLoading}
                            >
                                {isActivityGraphLoading ? 'Generating...' : 'Generate Graph'}
                            </button>
                            {isFirstGraphGenerated && (
                                <button onClick={handleClearGraphs} className="clear-btn">
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                </div>




                <div className={`activity-graph-main-content ${isPanelCollapsed ? 'expanded' : ''}`}>
                    {/* <h1>Mean Background Subtracted Indel Frequency Distribution</h1> */}

                    <div className="graph-container">
                        {!isActivityGraphLoading && activityGraphs.length === 0 && (
                            <div className="no-chart-message">
                                There is no chart yet. Configure parameters in the panel and click Generate.
                            </div>
                        )}

                        {activityGraphs.map(graph => (
                            <div key={graph.id} className="graph-card">
                                <div className="graph-title">
                                    {graph.parameterSets.map((set, i) => (
                                        <div key={i} className="graph-title-line">
                                            <span
                                                className="graph-color-chip"
                                                style={{ backgroundColor: graph.datasets[i]?.borderColor || "#999" }}
                                            />
                                            <span>
                                                <strong>PAM:</strong> <span style={{ fontWeight: "normal" }}>{set.pam}</span>
                                                <strong> | Number of mismatches:</strong> <span style={{ fontWeight: "normal" }}>{set.mismatches}</span>
                                                {set.mismatches === 1 && (
                                                    <>
                                                        <strong> | Mismatch position:</strong>{" "}
                                                        <span style={{ fontWeight: "normal" }}>
                                                            {set.mismatchPosition || "All Positions"}
                                                        </span>
                                                    </>
                                                )}
                                                <strong> | Variant:</strong> <span style={{ fontWeight: "normal" }}>{set.variant}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="chart-container">
                                    <Chart
                                        type="line"
                                        data={{
                                            datasets: graph.datasets,
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    display: false,
                                                },
                                            },
                                            scales: {
                                                x: {
                                                    type: 'linear',
                                                    min: sharedXAxisRange.min,
                                                    max: sharedXAxisRange.max,
                                                    title: {
                                                        display: true,
                                                        text: "Mean Background Subtracted Indel Frequency"
                                                    }
                                                },
                                                y: {
                                                    title: {
                                                        display: true,
                                                        text: "Density"
                                                    },
                                                    beginAtZero: true
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                        ))}

                        {isActivityGraphLoading && (
                            <div className="loading-container">
                                <p>Generating graph, please wait...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityGraph;