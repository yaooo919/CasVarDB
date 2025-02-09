import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useNavigate } from "react-router-dom";
import './Home.css';

function Home() {
    const [show, setShow] = useState(false);
    const [searchField, setSearchField] = useState("spacer_sequence_raw");
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        navigate(`/data?field=${encodeURIComponent(searchField)}&query=${encodeURIComponent(searchTerm)}`);
    };

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
                            <h1>Welcome to the Cas9 Variant Database</h1>
                            <p>Cas9 Variant Database is a database that contains .... It has&nbsp;
                                <strong><span class="standout-text">999,999</span></strong> datapoints across <strong><span class="standout-text">5</span></strong> studies</p>
                            
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
                                    <h2><i class="bi bi-search"></i>  Search Cas9 Database</h2>
                        
                                    <select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
                                        <option value="spacer_sequence_raw">Spacer sequence (raw)</option>
                                        <option value="target_context_sequence_raw">Target context sequence (raw)</option>
                                        <option value="spacer_sequence">Spacer sequence</option>
                                        <option value="target_context_sequence">Target context sequence</option>
                                        <option value="variant">Variant</option>
                                        <option value="nuclease">Nuclease</option>
                                        <option value="gRNA_scaffold">gRNA scaffold</option>
                                        <option value="day">Day</option>
                                        <option value="tRNA_feature">tRNA feature</option>
                                        <option value="study">Study</option>
                                    </select>
                                </div>
                    
                                <input 
                                    type="text" 
                                    placeholder="Search by keywords such as sequence, Cas9 variants, etc."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                                <button onClick={handleSearch}>SEARCH</button>
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
                        <li><a href="/Cas9.csv" download="full_data.csv">Full Data</a></li>
                        <li><a href="/gRNA_scaffolds.csv" download="gRNA_scaffold.csv">gRNA Scaffold</a></li>
                        <li><a href="/column_description.pdf" download="data_description.pdf">Data Column Description</a></li>
                    </ul>
                </Modal.Body>
            </Modal>
        </div>
    )
}

export default Home;