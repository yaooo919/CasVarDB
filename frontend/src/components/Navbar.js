import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
    const location = useLocation();
    const navbarClass = location.pathname === "/" ? "navbar-home" : "navbar-data";

    return (
        <div>
            <div className="navbar-bg">
                <div className={`${navbarClass}`}>
                    <div className="logo">
                        <Link to='/'>Cas9 Variant Database</Link>
                    </div>
        
                    <div className="collapse-menu">
                        <div className="bar"></div>
                        <div className="bar"></div>
                        <div className="bar"></div>
                    </div>
        
                    <ul className="navbar-menu">
                        <li><Link to='/'>Home</Link></li>
                        <li><Link to='/data'>Data</Link></li>
                        <li>
                            <Link to='/statistics'>Statistics <i className="bi bi-chevron-compact-down"></i></Link>
                            <ul className="dropdown-menu">
                                <li><Link to='/statistics/activity-graph'>Activity Graph</Link></li>
                                <li><Link to='/statistics'>Other Statistics</Link></li>
                            </ul>
                        </li>
                        <li><Link to='/grna'>gRNA Scaffold</Link></li>
                        <li><Link to='/studies'>Studies</Link></li>
                        <li><Link to='/submit'>Submit</Link></li>
                        <li><Link to='https://app.theneo.io/9a4553cf-e503-44a2-974d-16e072f7143c/cas9-variant-database'>API</Link></li>
                        <li><Link to='/contact'>Contact</Link></li>
                    </ul>
                </div>
            </div>            
        </div>
    )
}

export default Navbar;