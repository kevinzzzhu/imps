import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Link } from "react-router-dom";
import { Typography, List, ListItem, Box, Modal, Paper, Button } from '@mui/material';
import InputVis from './components/InputVis';
import OutputVis from './components/OutputVis';
import { Audio } from 'react-loader-spinner'; // loading animation
import TimeSeriesGraph from './components/TimeSeriesGraph';
import DelaunayGraph from './components/DelaunayGraph';
import SplomGraph from './components/SplomGraph';
import ParallelGraph from './components/ParallelGraph';
import ViolinGraph from './components/ViolinGraph';
import OscillationGraph from './components/OscillationGraph';

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
    flex-shrink: 0;
    height: 80vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const LogListContent = styled.div`
    overflow-y: auto;
    flex-grow: 1;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 10px;

    button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: #007bff;
    color: white;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;

        &:hover:not(:disabled) {
            background-color: #0056b3;
        }

        &:disabled {
                cursor: not-allowed;
            }
    }
`;

const MainContent = styled.div`
    flex-grow: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const StyledModal = styled(Modal)`
    display: flex;
    align-items: center;
    justify-content: center;
`;

const ModalContent = styled(Paper)`
    padding: 20px;
    max-width: 80vw;
    max-height: 80vh;
    overflow-y: auto;
    background-color: white;
    position: relative;
`;

const CloseButton = styled.button`
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 10px;
    border: none;
    background: #f44336;
    color: white;
    cursor: pointer;
    border-radius: 4px;
    
    &:hover {
        background: #d32f2f;
    }
`;

const LogItem = styled(ListItem)`
    &:hover {
        background-color: #e0e0e0;
    }
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 10px;

    input[type="checkbox"] {
        cursor: pointer;
        width: 16px;
        height: 16px;
    }
`;

const parseLogData = (content) => {
    try {
        const lines = content.trim().split('\n');
        const data = {
            dimension: 0,
            samples: []  // Array of complete data points
        };
        
        lines.forEach(line => {
            const [timestamp, source, ...values] = line.split(',');
            if (source === 'interface') {
                const numericValues = values.map(v => parseFloat(v));
                data.samples.push({
                    timestamp: new Date(timestamp),
                    source: source,
                    values: numericValues
                });
                
                // Set dimension based on first valid entry
                if (data.dimension === 0) {
                    data.dimension = numericValues.length;
                }
            }
        });
        
        return {
            ...data,
            totalSamples: data.samples.length,
            timeRange: {
                start: data.samples[0]?.timestamp,
                end: data.samples[data.samples.length - 1]?.timestamp
            }
        };
    } catch (error) {
        console.error('Error parsing log data:', error);
        return null;
    }
};

function Home() {
    const [inputData, setInputData] = useState([]);
    const [outputData, setOutputData] = useState([]);
    const [logFiles, setLogFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wsStatus, setWsStatus] = useState('Connecting...');
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [logContent, setLogContent] = useState('');
    const [logData, setLogData] = useState(null);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [selectedView, setSelectedView] = useState('basic');

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
                // console.log('Received message:', message);
                
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

    // Add function to fetch log content
    const fetchLogContent = async (filename) => {
        try {
            setLogContent("Loading..."); 
            setModalOpen(true);  
            
            const response = await axios.get(`/api/logs/${filename}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data && response.data.error) {
                const errorMsg = `Server Error: ${response.data.error}`;
                console.error(errorMsg);
                setLogContent(errorMsg);
            } else {
                const parsedData = parseLogData(response.data);
                if (parsedData) {
                    setLogContent(
                        `Dimension: ${parsedData.dimension}\n` +
                        `Total Samples: ${parsedData.totalSamples}\n` +
                        `Time Range: ${parsedData.timeRange.start.toLocaleString()} - ` +
                        `${parsedData.timeRange.end.toLocaleString()}\n\n` +
                        `Raw Data:\n${response.data}`
                    );
                    // Store parsed data for visualization
                    setLogData(parsedData);
                } else {
                    setLogContent("Error parsing log data");
                }
            }
        } catch (error) {
            const errorMsg = `Error loading log file: ${error.message}\nDetails: ${JSON.stringify(error.response?.data || {}, null, 2)}`;
            console.error(errorMsg);
            setLogContent(errorMsg);
        }
    };

    // Handle log file click
    const handleLogClick = (filename) => {
        setSelectedLog(filename);
        fetchLogContent(filename);
    };

    // Add handler for checkbox changes
    const handleCheckboxChange = (filename) => {
        setSelectedLogs(prev => {
            if (prev.includes(filename)) {
                return prev.filter(f => f !== filename);
            } else {
                return [...prev, filename];
            }
        });
    };

    // Add handler for train button
    const handleTrain = async () => {
        if (selectedLogs.length === 0) {
            alert('Please select at least one log file');
            return;
        }

        try {
            const response = await axios.post('/api/train', {
                logFiles: selectedLogs
            });
            alert('Training started successfully!');
        } catch (error) {
            console.error('Error starting training:', error);
            alert('Failed to start training');
        }
    };

    return (
        <Container>
            <LogList>
                <Typography variant="h6" gutterBottom>Select Log Files</Typography>
                <LogListContent>
                    {loading ? (
                        <Audio height="80" width="80" color="green" ariaLabel="loading" />
                    ) : logFiles.length > 0 ? (
                        <List>
                            {logFiles.map((file, index) => (
                                <LogItem 
                                    button 
                                    key={index} 
                                    onClick={() => handleLogClick(file)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedLogs.includes(file)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleCheckboxChange(file);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {file}
                                </LogItem>
                            ))}
                        </List>
                    ) : (
                        <p>No log files found.</p>
                    )}
                </LogListContent>
                <ButtonContainer>
                    <button>Import</button>
                    <button 
                        onClick={handleTrain}
                        disabled={selectedLogs.length === 0}
                        style={{
                            opacity: selectedLogs.length === 0 ? 0.5 : 1,
                            cursor: selectedLogs.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Train
                    </button>
                </ButtonContainer>
            </LogList>

            {/* Add Modal */}
            <StyledModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                aria-labelledby="log-modal-title"
            >
                <ModalContent elevation={24}>
                    <CloseButton onClick={() => setModalOpen(false)}>
                        ×
                    </CloseButton>
                    <Typography variant="h6" id="log-modal-title" gutterBottom>
                        {selectedLog}
                    </Typography>

                    {/* Add view selector buttons */}
                    <Box sx={{ mb: 2, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <Button 
                            variant={selectedView === 'basic' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('basic')}
                        >
                            Basic View
                        </Button>
                        <Button
                            variant={selectedView === 'delaunay' ? 'contained' : 'outlined'} 
                            onClick={() => setSelectedView('delaunay')}
                        >
                            Delaunay View
                        </Button>
                        <Button
                            variant={selectedView === 'splom' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('splom')}
                        >
                            Splom View
                        </Button>
                        <Button
                            variant={selectedView === 'parallel' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('parallel')}
                        >
                            Parallel View
                        </Button>
                        <Button
                            variant={selectedView === 'violin' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('violin')}
                        >
                            Violin View
                        </Button>
                        <Button
                            variant={selectedView === 'oscillation' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('oscillation')}
                        >
                            Oscillation View
                        </Button>
                    </Box>

                    {/* Conditional rendering based on selected view */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {selectedView === 'basic' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Basic View</Typography>
                                {logData && <TimeSeriesGraph data={logData} />}
                            </Box>
                        )}
                        
                        {selectedView === 'delaunay' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Delaunay View</Typography>
                                {logData && <DelaunayGraph data={logData} />}
                            </Box>
                        )}

                        {selectedView === 'splom' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Splom View</Typography>
                                {logData && <SplomGraph data={logData} />}
                            </Box>
                        )}

                        {selectedView === 'parallel' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Parallel View</Typography>
                                {logData && <ParallelGraph data={logData} />}
                            </Box>
                        )}

                        {selectedView === 'violin' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Violin View</Typography>
                                {logData && <ViolinGraph data={logData} />}
                            </Box>
                        )}

                        {selectedView === 'oscillation' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Oscillation View</Typography>
                                {logData && <OscillationGraph data={logData} />}
                            </Box>
                        )}
                    </Box>
                    

                    {/* Log content */} 
                    Raw Data:
                    <Box sx={{ 
                        mt: 2,
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        backgroundColor: '#f5f5f5',
                        padding: '15px',
                        borderRadius: '4px'
                    }}>
                        {logContent}
                    </Box>
                </ModalContent>
            </StyledModal>

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
