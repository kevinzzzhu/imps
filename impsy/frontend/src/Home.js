import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Link } from "react-router-dom";
import { Typography, List, ListItem, Box, Modal, Paper } from '@mui/material';
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

// Add styled components for the modal
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

function Home() {
    const [inputData, setInputData] = useState([]);
    const [outputData, setOutputData] = useState([]);
    const [logFiles, setLogFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wsStatus, setWsStatus] = useState('Connecting...');
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [logContent, setLogContent] = useState('');

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

    const parseLogContent = (content) => {
        const lines = content.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const [timestamp, source, ...values] = line.split(',');
            return {
                timestamp,
                source,
                values: values.map(v => parseFloat(v))
            };
        });
    };

    // Modify fetchLogContent
    const fetchLogContent = async (filename) => {
        try {
            const response = await fetch(`/logs/${filename}`);
            const text = await response.text();
            const parsedData = parseLogContent(text);
            setLogContent(JSON.stringify(parsedData, null, 2));
            setModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch log content:', error);
        }
    };

    // Handle log file click
    const handleLogClick = (filename) => {
        setSelectedLog(filename);
        fetchLogContent(filename);
    };

    return (
        <Container>
            <LogList>
                <Typography variant="h6" gutterBottom>Select Log Files</Typography>
                {loading ? (
                    <Audio height="80" width="80" color="green" ariaLabel="loading" />
                ) : logFiles.length > 0 ? (
                    <List>
                        {logFiles.map((file, index) => (
                            <ListItem 
                                button 
                                key={index} 
                                onClick={() => handleLogClick(file)}
                                style={{ cursor: 'pointer' }}
                            >
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
                    <Box sx={{ 
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
