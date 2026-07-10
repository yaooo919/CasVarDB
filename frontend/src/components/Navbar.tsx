import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const navbarClass = location.pathname === "/" ? "navbar-home" : "navbar-data";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div>
      <div className="navbar-bg">
        <nav className={navbarClass} aria-label="Primary navigation">
          <div className="logo">
            <Link to="/" onClick={closeMenu}>CasVarDB</Link>
          </div>

          <button
            type="button"
            className="collapse-menu"
            aria-controls="primary-navigation-menu"
            aria-expanded={isMenuOpen}
            aria-label={`${isMenuOpen ? "Close" : "Open"} navigation menu`}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>

          <ul
            id="primary-navigation-menu"
            className={`navbar-menu${isMenuOpen ? " is-open" : ""}`}
            aria-label="Primary navigation menu"
            onClick={closeMenu}
          >
            <li><Link to="/">Home</Link></li>
            <li>
              <Link to="/data/cas9">Data <i className="bi bi-chevron-compact-down"></i></Link>
              <ul className="dropdown-menu">
                <li><Link to="/data/cas9">Cas9 Data</Link></li>
                <li><Link to="/data/cas12">Cas12 Data</Link></li>
              </ul>
            </li>
            <li>
              <Link to="/statistics">Statistics <i className="bi bi-chevron-compact-down"></i></Link>
              <ul className="dropdown-menu">
                <li><Link to="/statistics/activity-graph">Activity Graph</Link></li>
                <li><Link to="/statistics">Other Statistics</Link></li>
              </ul>
            </li>
            <li><Link to="/grna">gRNA Scaffold</Link></li>
            <li><Link to="/studies">Studies</Link></li>
            <li><Link to="/submit">Submit</Link></li>
            {/* <li><a
                                href="https://app.theneo.io/9a4553cf-e503-44a2-974d-16e072f7143c/cas-var-db"
                                target="_blank"
                                rel="noopener noreferrer">API
                            </a>
                        </li> */}
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default Navbar;
