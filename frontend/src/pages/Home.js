import React from 'react';
import './Home.css';

function Home() {
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
                                <a href='#'>
                                    <button type="button">Statistics  <i class="bi bi-bar-chart-line-fill"></i></button>
                                </a>
                                <a href='#'>
                                    <button type="button">Download  <i class="bi bi-download"></i></button>
                                </a>
                            </div>
                        </div>
                
                        <div class="search-column">
                            <div class="search-box">
                                <div class="search-box-top">
                                    <h2><i class="bi bi-search"></i>  Search Cas9 Database</h2>
                        
                                    <select>
                                        <option value="spacer">By Spacer</option>
                                        <option value="target">By Target</option>
                                        <option value="study">By Study</option>
                                        <option value="gRNA_scaffold">By gRNA Scaffold</option>
                                    </select>
                                </div>
                    
                                <input type="text" placeholder="Search by keywords such as sequence, Cas9 variants, etc." />
                                <button>SEARCH</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;