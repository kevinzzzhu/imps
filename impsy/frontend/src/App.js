import React, { useState } from "react";
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TogglableMenu from './components/Menu';
import Datasets from './Datasets';
import Home from './Home';
import Configs from './Config';
import Logs from './Logs';
import Models from './Models';
import About from "./About";
import FeedbackForm from './Feedback';
import FAQ from './Faq';
import RecentProjects from "./Recent";
import Project from "./Project";
import { createGlobalStyle } from 'styled-components';

// Create a new component for the header
const Header = ({ toggleMenu, isMenuOpen }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  // Use black color if menu is open, otherwise use page-dependent color
  const color = isMenuOpen ? 'black' : (isHomePage ? 'white' : 'black');

  return (
    <div style={{
      position: 'fixed', 
      zIndex: 1301,
      top: 10, 
      left: 10,
      display: 'flex',
      alignItems: 'center'
    }}>
      <IconButton 
        onClick={toggleMenu}
        sx={{ 
          color: color,
          '&:hover': {
            backgroundColor: isMenuOpen || !isHomePage ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <MenuIcon />
      </IconButton>
      <span style={{ 
        marginLeft: '20px', 
        fontSize: '18px', 
        fontWeight: 'bold',
        color: color,
        transition: 'color 0.3s ease'
      }}>
        IMPSY
      </span>
    </div>
  );
};

function App() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  let closeTimeout = null;  // Declare a variable to hold the timeout, so it can be cleared if needed

  const toggleMenu = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);  // Clear any existing timeout to prevent unwanted closure
    }
    setMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    closeTimeout = setTimeout(() => {
      setMenuOpen(false);
    }, 1000);  // Delay closing by 1 second
  };

  const GlobalStyle = createGlobalStyle`
  body {
    width: 100vw;
    height: 100vh;
    overflow-x: hidden; // Prevents horizontal scrolling
  }
`;

  return (
    <Router>
      <GlobalStyle />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center', 
        minHeight: '100vh',
        position: 'relative'
      }}>
        <Routes>
          <Route path="*" element={<Header toggleMenu={toggleMenu} isMenuOpen={isMenuOpen} />} />
        </Routes>
        <TogglableMenu isOpen={isMenuOpen} onClose={closeMenu} />
        <main style={{ flex: 1, transition: 'margin 0.3s ease-in-out' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/config" element={<Configs />} />
            <Route path="/models" element={<Models />} />
            <Route path="/recent" element={<RecentProjects />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/about" element={<About />} />
            <Route path="/feedback" element={<FeedbackForm />} />
            <Route path="/project" element={<Project />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
