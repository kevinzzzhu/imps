import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TogglableMenu from './components/Menu';
import MIDIDeviceStatus from './components/MIDIDeviceStatus';
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
import styled from 'styled-components';

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

const PageContainer = styled.main`
    flex: 1;
    transition: opacity 0.8s ease-in-out;
    opacity: ${props => props.isTransitioning ? 0 : 1};
`;

function App() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isModelRunning, setIsModelRunning] = useState(false);
  let closeTimeout = null;

  const toggleMenu = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    setMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    closeTimeout = setTimeout(() => {
      setMenuOpen(false);
    }, 1000);  // Delay closing by 1 second
  };

  // Function for Project component to call when model status changes
  const handleModelRunningChange = (running) => {
    setIsModelRunning(running);
  };

  const GlobalStyle = createGlobalStyle`
  body {
    width: 100vw;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: hidden;
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
        <PageContainer isTransitioning={isTransitioning}>
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
            <Route path="/project/:projectName" element={<Project onModelRunningChange={handleModelRunningChange} />} />
          </Routes>
        </PageContainer>
        <MIDIDeviceStatus isHidden={isModelRunning} />
      </div>
    </Router>
  );
}

export default App;
