import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Link } from "react-router-dom";
import { Typography, List, ListItem, Box } from '@mui/material';
import InputVis from './components/InputVis';
import OutputVis from './components/OutputVis';
import { Audio } from 'react-loader-spinner'; // loading animation

const Container = styled.div`
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
`;

const LogList = styled.div`
  width: 250px;
  background-color: #f4f4f4;
  padding: 20px;
  overflow-y: auto;
  flex-shrink: 0;
`;

const MainContent = styled.div`
  flex-grow: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

function Home() {
    const [inputData, setInputData] = useState([]);
    const [outputData, setOutputData] = useState([]);
    const [logFiles, setLogFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wsStatus, setWsStatus] = useState('Connecting...');


    useEffect(() => {
        fetchLogFiles();
    }, []);
    
    const fetchLogFiles = async () => {
        try {
            const response = await axios.get('/api/logs');
            setLogFiles(response.data);
            setLoading(false);  // Set loading to false after fetching data
        } catch (error) {
            console.error('Failed to fetch log files:', error);
            setLoading(false);  // Ensure loading is set to false even if there is an error
        }
    };

    useEffect(() => {
        // Fetch log files
        const fetchLogFiles = async () => {
            try {
                const response = await axios.get('/api/logs');
                setLogFiles(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching log files:', error);
                setLoading(false);
            }
        };

        fetchLogFiles();

        // WebSocket connection
        const ws = new WebSocket('ws://localhost:8080');
        
        ws.onopen = () => {
            console.log('Connected to WebSocket server');
            setWsStatus('Connected');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('Received message:', message);
                
                if (message.type === 'input') {
                    setInputData(message.data);
                } else if (message.type === 'output') {
                    setOutputData(message.data);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setWsStatus('Error connecting');
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
            setWsStatus('Disconnected');
        };

        // Cleanup
        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    return (
        <Container>
            <LogList>
                <Typography variant="h6" gutterBottom>Select Log Files</Typography>
                {loading ? (
                    <Audio height="80" width="80" color="green" ariaLabel="loading" />
                ) : logFiles.length > 0 ? (
                    <List>
                        {logFiles.map((file, index) => (
                            <ListItem button key={index} component={Link} to={`/${file}`}>
                                {file}
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <p>No log files found.</p>
                )}
                <button>Import</button>
                <button>Train</button>
            </LogList>
            <MainContent>
                <Typography variant="h4" gutterBottom>IMPSY Visualization</Typography>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-evenly' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <InputVis data={inputData}/>
                        <Typography variant="subtitle1">Input</Typography>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <OutputVis data={outputData}/>
                        <Typography variant="subtitle1">Output</Typography>
                    </div>
                </div>
            </MainContent>
        </Container>
    );
}

export default Home;
