import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios'; // For making API calls to Flask
import { Link } from "react-router-dom";
import './styles/styles.css';
import { Audio } from 'react-loader-spinner';
import p5 from 'p5';
import sketch from './p5/sketch';

function Home() {
    const [routes, setRoutes] = useState([]);
    const [hardwareInfo, setHardwareInfo] = useState({});
    const [softwareInfo, setSoftwareInfo] = useState({});
    const [loadingHardware, setLoadingHardware] = useState(true);
    const [loadingSoftware, setLoadingSoftware] = useState(true);
    const sketchRef = useRef();

    useEffect(() => {
        new p5(sketch, sketchRef.current);
    
        return () => {
          sketchRef.current.innerHTML = ''; // Cleanup the canvas when the component unmounts
        }
      }, []);

    useEffect(() => {
        fetchRoutes();
        fetchHardwareInfo();
        fetchSoftwareInfo();
    }, []);
  
    const fetchRoutes = async () => {
        const response = await axios.get('/api/routes');
        setRoutes(response.data);
    };
  
    const fetchHardwareInfo = async () => {
        const response = await axios.get('/api/hardware-info');
        setHardwareInfo(response.data);
        setLoadingHardware(false);
    };
  
    const fetchSoftwareInfo = async () => {
        const response = await axios.get('/api/software-info');
        setSoftwareInfo(response.data);
        setLoadingSoftware(false);
    };
  
    return (
        <div>
            <h1>IMPSY Web Interface</h1>
            <h2>Pages:</h2>
            <ul>
                <li><Link to="/logs">Logs</Link></li>
                <li><Link to="/datasets">Datasets</Link></li>
                <li><Link to="/models">Models</Link></li>
                <li><Link to="/config">Edit Config</Link></li>
            </ul>
            
            <h2>System Information:</h2>
            {loadingHardware ? (
                <Audio height="80" width="80" color="green" ariaLabel="loading" />
            ) : (
                <ul>
                    {Object.entries(hardwareInfo).map(([key, value]) => (
                        <li key={key}><strong>{key}:</strong> {value}</li>
                    ))}
                </ul>
            )}
            
            <h2>Project Information:</h2>
            {loadingSoftware ? (
                <Audio height="80" width="80" color="green" ariaLabel="loading" />
            ) : (
                <ul>
                    {Object.entries(softwareInfo).map(([key, value]) => (
                        <li key={key}>
                            <strong>{key}:</strong> 
                            {typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ? 
                                <a href={value} target="_blank" rel="noopener noreferrer">{value}</a> : value}
                        </li>
                    ))}
                </ul>
            )}

            <div ref={sketchRef} />

        </div>
    );
}

export default Home;
