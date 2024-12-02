import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
    return (
        <div>
            <div className="navbar-bg">
                <div className="navbar-content">
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
                        <li><Link to='/'>Statistics</Link></li>
                        <li><Link to='/'>gRNA Scaffold</Link></li>
                        <li><Link to='/'>Studies</Link></li>
                        <li><Link to='/'>Download</Link></li>
                        <li><Link to='/'>Submit</Link></li>
                        <li><Link to='/contact'>Contact</Link></li>
                    </ul>
                </div>
            </div>            
        </div>
    )
}

export default Navbar;