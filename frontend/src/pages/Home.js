import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useNavigate } from "react-router-dom";
import './Home.css';

function Home() {
    const [show, setShow] = useState(false);
    const [searchField, setSearchField] = useState("spacer_sequence_raw");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDB, setSelectedDB] = useState(null);
    const [activeTag, setActiveTag] = useState(null);
    const navigate = useNavigate();

    const searchTags = [
        {label1: "GACTGCAATACTCGCCAGCC", label2: "(Spacer sequence (raw))", field: "spacer_sequence_raw", query: "GACTGCAATACTCGCCAGCC"},
        {label1: "NNNNNNNAAAAAAAAACTCCAAAACCCTGGNNNNNNNNNNNN", label2: "(Target context sequence)", field: "target_context_sequence", query: "NNNNNNNAAAAAAAAACTCCAAAACCCTGGNNNNNNNNNNNN"},
        {label1: "Sniper-Cas9-NLS-FLAG-P2A", label2: "(Variant)", field: "variant", query: "Sniper-Cas9-NLS-FLAG-P2A"},
        {label1: "SpCas9", label2:"(Nuclease)", field: " nuclease", query: "SpCas9"},
        {label1: "SpCas9 scaffold 1", label2: "(gRNA scaffold)", field: "gRNA_scaffoldd", query: "SpCas9 scaffold 1"},
        {label1: "['Wild SpCas9']", label2: "(Study)", field: "study", query: "['Wild SpCas9']"},
        {label1: "3", label2: "(Number of mismatches)", field: "number_of_mismatches", query: "3"},
        {label1: "Lentiviral", label2: "(Cas12a transfection)", field: "cas12a_transfection", query: "Lentiviral"}
    ]

    const handleSearch = (targetDB) => {
        const term = searchTerm.trim();

        if (searchField === 'cas12a_transfection' && targetDB === 'Cas9') {
            alert(`The field "Cas12a transfection" is only applicable to the Cas12 dataset.`);
            return;
        }

        if (!term) {
            const confirmMessage = `Do you want to leave the search term blank and retrieve all data for ${targetDB}?`
            const proceed = window.confirm(confirmMessage);
            if (!proceed) return;
        }

        setSelectedDB(targetDB);

        if (!term) {
            navigate(`/data/${targetDB.toLowerCase()}`)
        } else {
            navigate(`/data/${targetDB.toLowerCase()}?field=${encodeURIComponent(searchField)}&query=${encodeURIComponent(searchTerm)}`);
        }
    };

    const handleTagClick = (tag) => {
        setSearchField(tag.field);
        setSearchTerm(tag.query);
        setActiveTag(tag.label1);
    }

    return (
        <div>
            <div class="video-background">
                <iframe src="https://player.vimeo.com/video/871987849?autoplay=1&loop=1&muted=1&background=1"
                    title='CRISPR/Cas9 interaction video' 
                    frameborder="0" 
                    allow="autoplay; fullscreen" 
                    allowfullscreen>
                </iframe>
            </div>
            <div class="main-content">
                <div class="container">
                    <div class="content">
                        <div class="text-column">
                            <h1>Welcome to the CasVarDB</h1>
                            <p>
                                The CasVarDB contains information on guide RNA sequences, target sites, experimental conditions, and background-subtracted indel frequencies for both Cas9 and Cas12 systems.&nbsp;
                                The <strong>Cas9 dataset</strong> spans <strong><span class="standout-text">7</span></strong> studies with a total of <strong><span class="standout-text">1,746,674</span></strong> datapoints,&nbsp;
                                covering <strong><span class="standout-text">40</span></strong> Cas9 variants and <strong><span class="standout-text">16</span></strong> gRNA scaffolds.&nbsp;
                                The <strong>Cas12 dataset</strong> includes <strong><span class="standout-text">250,254</span></strong> datapoints from <strong><span className="standout-text">4</span></strong> studies,&nbsp;
                                featuring <strong><span className="standout-text">26</span></strong> Cas12 variants and <strong><span className="standout-text">6</span></strong> gRNA scaffolds.&nbsp;
                                These datasets support research on CRISPR activity, specificity, and editing efficiency, serving as a valuable resource for deep learning models and bioinformatics analysis.
                                </p>
                            
                            <div class="text-column-buttons">
                                <a href='/statistics'>
                                    <button type="button">Statistics  <i class="bi bi-bar-chart-line-fill"></i></button>
                                </a>
                                <a href='#'>
                                    <button type="button" onClick={() => setShow(true)}>Download  <i class="bi bi-download"></i></button>
                                </a>
                            </div>
                        </div>
                
                        <div class="search-column">
                            <div class="search-box">
                                <div class="search-box-top">
                                    <h2><i class="bi bi-search"></i>  Search Database</h2>
                        
                                    <select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
                                        <option value="spacer_sequence_raw">Spacer sequence (raw)</option>
                                        <option value="target_context_sequence_raw">Target context sequence (raw)</option>
                                        <option value="spacer_sequence">Spacer sequence</option>
                                        <option value="target_context_sequence">Target context sequence</option>
                                        <option value="variant">Variant</option>
                                        <option value="nuclease">Nuclease</option>
                                        <option value="gRNA_scaffold">gRNA scaffold</option>
                                        <option value="day">Day</option>
                                        <option value="cas12a_transfection">Cas12a transfection</option>
                                        <option value="tRNA_feature">tRNA feature</option>
                                        <option value="study">Study</option>
                                        <option value="number_of_mismatches">Number of mismatches</option>
                                    </select>
                                </div>
                    
                                <input 
                                    type="text" 
                                    // placeholder="Search by keywords such as sequence, Cas9 variants, etc."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                                
                                <div className="dropdown">
                                    <button className="dropbtn" 
                                        onClick={() => { if (selectedDB) handleSearch(selectedDB);}}
                                    > 
                                    {selectedDB === null ? 'SEARCH' : `Search ${selectedDB}`} <i class="bi bi-caret-down-fill"></i>
                                    </button>
                                    <div className="dropdown-content">
                                        <a href='#' 
                                            onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedDB('Cas9');
                                            handleSearch('Cas9');
                                        }}
                                        >
                                        Search Cas9
                                        </a>
                                        <a  href='#'
                                            onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedDB('Cas12');
                                            handleSearch('Cas12');
                                        }}
                                        >
                                        Search Cas12
                                        </a>
                                    </div>
                                </div>


                                <p className='example-search'>Example Search:</p>
                                <div className='search-tags'>
                                    {searchTags.map((tag) => (
                                        <span
                                            key={tag.label1}
                                            className={`tag-bubble ${activeTag === tag.label1 ? 'active' : ''}`}
                                            onClick={() => handleTagClick(tag)}
                                        >
                                            {tag.label1}&nbsp;&nbsp;<i>{tag.label2}</i>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal show={show} onHide={() => setShow(false)} centered>
                <Modal.Body className="custom-modal-body">
                    <button className="close-button" onClick={() => setShow(false)}>×</button>
                    <p>Select the file you want to download:</p>
                    <ul>
                        <li><a href="https://cas9-data.s3.eu-west-2.amazonaws.com/cas9_new2.csv" download="cas9_data.csv">Cas9 Data</a></li>
                        <li><a href="https://cas9-data.s3.eu-west-2.amazonaws.com/cas12_new2.csv" download="cas12_data.csv">Cas12 Data</a></li>
                        <li><a href="https://cas9-data.s3.eu-west-2.amazonaws.com/gRNA_scaffolds.csv" download="gRNA_scaffold.csv">gRNA Scaffold</a></li>
                        <li><a href="https://cas9-data.s3.eu-west-2.amazonaws.com/CasVarDB_column_description.pdf" download="column_description.pdf">Data Column Description</a></li>
                    </ul>
                </Modal.Body>
            </Modal>
        </div>
    )
}

export default Home;