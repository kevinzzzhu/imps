import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Typography, List, ListItem, Box, Modal, Paper, Button, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, TextField } from '@mui/material';
import InputVis from './components/project/InputVis';
import OutputVis from './components/project/OutputVis';
import { Audio } from 'react-loader-spinner';
import TimeSeriesGraph from './components/logVis/TimeSeriesGraph';
import DelaunayGraph from './components/logVis/DelaunayGraph';
import SplomGraph from './components/logVis/SplomGraph';
import ParallelGraph from './components/logVis/ParallelGraph';
import ViolinGraph from './components/logVis/ViolinGraph';
import OscillationGraph from './components/logVis/OscillationGraph';
import { useLocation, useNavigate } from 'react-router-dom';
import TrainingVisualizer from './components/home/TrainingVisualizer';

const Container = styled.div`
    display: flex;
    height: 100vh;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.8s ease;
`;

const LogList = styled.div`
    width: 320px;
    height: 80vh;
    background: #f5f5f5;
    padding: 20px;
    flex-shrink: 0;
    height: 85vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const LogListContent = styled.div`
    flex: 1;
    overflow-y: ${props => props.$expanded ? 'auto' : 'hidden'};
    max-height: ${props => props.$expanded ? '40vh' : '0'};
    transition: max-height 0.3s ease-out;
    margin: 0;
    padding: ${props => props.$expanded ? '10px 0' : '0'};
    opacity: ${props => props.$expanded ? '1' : '0'};
    transition: all 0.3s ease;

    /* Scrollbar styles */
    &::-webkit-scrollbar {
        width: 8px;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
`;

const ButtonContainer = styled.div`
    position: fixed;
    bottom: 20px;
    left: 20px;
    display: flex;
    gap: 10px;
    background: rgba(255, 255, 255, 0.9);
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    backdrop-filter: blur(4px);
    z-index: 100;

    button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background-color: #007bff;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        font-weight: 500;

        &:hover:not(:disabled) {
            background-color: #0056b3;
            transform: translateY(-1px);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }
`;

const MainContent = styled.div`
    flex-grow: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative; 
`;

const StatusDot = styled.div`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.isRunning ? '#2ecc71' : '#e74c3c'};
    position: relative;
    margin-right: 12px;
    
    &::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: ${props => props.isRunning ? '#2ecc71' : '#e74c3c'};
        opacity: 0.4;
        animation: ${props => props.isRunning ? 'pulse 2s infinite' : 'none'};
    }

    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 0.4;
        }
        50% {
            transform: scale(2);
            opacity: 0;
        }
        100% {
            transform: scale(1);
            opacity: 0.4;
        }
    }
`;

const RunButtonContainer = styled.div`
    position: absolute;
    top: 20px;
    right: 10px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 16px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
    }

    button {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        background-color: #808080;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;

        &:hover:not(:disabled) {
            background-color: #666666;
            transform: translateY(-1px);
        }

        &:active:not(:disabled) {
            transform: translateY(1px);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }

        &.running {
            background-color: #808080;
            &:hover {
                background-color: #666666;
            }
        }
    }
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

    /* Hide scrollbar for Chrome, Safari and Opera */
    &::-webkit-scrollbar {
        display: none;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
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

const LogItem = styled.div`
    display: flex;
    align-items: center;
    padding: 8px 12px;
    margin: 4px 0;
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #f8f9fa;
        transform: translateX(2px);
    }

    input[type="checkbox"] {
        margin-right: 12px;
        width: 18px;
        height: 18px;
        cursor: pointer;
    }
`;

const ConfigContainer = styled.div`
    position: fixed;
    top: 40px;
    right: ${props => props.isOpen ? '20px' : 'calc(-70vw - 40px)'};
    width: 70vw;
    height: 90vh;
    max-height: 80vh;
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(10px);
    transition: right 0.3s ease;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: flex;
    flex-direction: column;

    &::before {
        content: '${props => props.isOpen ? '›' : '‹'}';
        position: absolute;
        left: -20px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 60px;
        background: rgba(30, 30, 30, 0.95);
        border-radius: 8px 0 0 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        font-size: 20px;
        transition: background-color 0.2s ease;

        &:hover {
            background: rgba(40, 40, 40, 0.95);
        }
    }
`;

const ConfigCloseButton = styled.button`
    position: absolute;
    top: 15px;
    right: 15px;
    background: transparent;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
`;

const ConfigTitle = styled.h2`
    color: white;
    margin: 0 0 20px;
    font-size: 20px;
    padding-right: 40px;
`;

const ConfigContent = styled.div`
    flex: 1;
    overflow-y: auto;
    color: white;
    font-size: 14px;
    
    /* Hide scrollbar for Chrome, Safari and Opera */
    &::-webkit-scrollbar {
        display: none;
    }
    
    /* Hide scrollbar for IE, Edge and Firefox */
    -ms-overflow-style: none;
    scrollbar-width: none;
`;

const ConfigTextArea = styled.textarea`
    width: 100%;
    height: 100%;
    padding: 15px;
    background-color: transparent;
    color: white;
    font-family: monospace;
    font-size: 14px;
    resize: none;
    outline: none;
    border: none;
    border-radius: 4px;
    
    &:hover {
        border-color: rgba(255, 255, 255, 0.5);
    }
    
    &:focus {
        border-color: rgba(52, 152, 219, 0.8);
    }
`;

const SaveButton = styled.button`
    position: absolute;
    bottom: 15px;
    right: 15px;
    background-color: #4CAF50;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: #45a049;
    }

    &:active {
        transform: translateY(1px);
    }
`;

const LogSection = styled.div`
    margin-bottom: 15px;
    transition: all 0.3s ease;
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    cursor: pointer;
    border-bottom: 1px solid #ddd;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0,0,0,0.05);
    }
`;

const ExpandIcon = styled.span`
    transform: ${props => props.expanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
    transition: transform 0.3s ease;
    font-size: 12px;
`;

const parseLogData = (content) => {
    try {
        const lines = content.trim().split('\n');
        const data = {
            dimension: 0,
            samples: [] 
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

function Project() {
    const location = useLocation();
    const [inputData, setInputData] = useState([]);
    const [outputData, setOutputData] = useState([]);
    const [logFiles, setLogFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [logContent, setLogContent] = useState('');
    const [logData, setLogData] = useState(null);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [selectedView, setSelectedView] = useState('basic');
    const [isModelRunning, setIsModelRunning] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configContent, setConfigContent] = useState('');
    const [trainingStats, setTrainingStats] = useState(null);
    const [showTrainingDialog, setShowTrainingDialog] = useState(false);
    const [showTrainingVisualizer, setShowTrainingVisualizer] = useState(false);
    const [trainingConfig, setTrainingConfig] = useState({
        modelSize: 's',
        earlyStoppingEnabled: true,
        patience: 10,
        numEpochs: 100,
        batchSize: 64
    });
    const [selectedDimension, setSelectedDimension] = useState(null);
    const navigate = useNavigate();

    // Add state for expanded sections
    const [expandedSections, setExpandedSections] = useState({
        generated: false,
        training: false,
        other: false
    });

    // Add state for categorized logs
    const [categorizedLogs, setCategorizedLogs] = useState({
        generated: [],
        training: [],
        other: []
    });

    // Add this useEffect to automatically select training logs
    useEffect(() => {
        if (categorizedLogs.training.length > 0) {
            setSelectedLogs(prev => [
                ...new Set([...prev, ...categorizedLogs.training])
            ]);
        }
    }, [categorizedLogs.training]);

    useEffect(() => {
        // WebSocket connection
        const ws = new WebSocket('ws://localhost:8080');
        
        ws.onopen = () => {
            console.log('Connected to WebSocket server');
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
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
        };

        // Cleanup
        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    useEffect(() => {
        // Fade in when component mounts
        const container = document.querySelector('.project-container');
        if (container) {
            // Add a slight delay before fading in
            setTimeout(() => {
                requestAnimationFrame(() => {
                    container.style.opacity = '1';
                });
            }, 100);
        }

        // Reset body opacity with the same transition duration
        document.body.style.transition = 'opacity 0.8s ease';
        document.body.style.opacity = '1';
        
        return () => {
            // Cleanup transition styles when component unmounts
            document.body.style.opacity = '';
            document.body.style.transition = '';
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

    const handleCreateDataset = async () => {
        if (selectedLogs.length === 0) {
            alert('Please select at least one log file');
            return;
        }

        // Extract dimension from the first selected log file name
        const dimensionMatch = selectedLogs[0].match(/(\d+)d/);
        if (!dimensionMatch) {
            alert('Could not determine dimension from log file name');
            return;
        }
        const dimension = parseInt(dimensionMatch[1]);

        try {
            const response = await axios.post('/api/create-dataset', {
                logFiles: selectedLogs,
            });
            
            if (response.data.status === 'success') {
                setTrainingStats({
                    totalValues: response.data.stats.total_values,
                    totalInteractions: response.data.stats.total_interactions,
                    totalTime: response.data.stats.total_time,
                    numPerformances: response.data.stats.num_performances,
                    datasetFile: response.data.dataset_file
                });
                setSelectedDimension(dimension);  // Store the dimension for later use
                setShowTrainingDialog(true);
            }
        } catch (error) {
            console.error('Failed to create dataset:', error);
            alert('Failed to create dataset: ' + (error.response?.data?.error || error.message));
        }
    };

    // Add handleStartTraining function
    const handleStartTraining = async () => {
        setShowTrainingDialog(false);
        setShowTrainingVisualizer(true);
        
        try {
            await axios.post('/api/start-training', {
                dimension: selectedDimension,
                datasetFile: `training-dataset-${selectedDimension}d-selected.npz`,
                modelSize: trainingConfig.modelSize,
                earlyStoppingEnabled: trainingConfig.earlyStoppingEnabled,
                patience: trainingConfig.patience,
                numEpochs: trainingConfig.numEpochs,
                batchSize: trainingConfig.batchSize
            });
        } catch (error) {
            console.error('Failed to start training process:', error);
            alert('Failed to start training: ' + (error.response?.data?.error || error.message));
        }
    };

    // Add handler for run button
    const handleRunClick = async () => {
        if (isModelRunning) {
            // Stop the model
            try {
                setLoading(true);
                await stopModel();
                // Fetch config after stopping the model
                await fetchConfig();
            } catch (error) {
                console.error('Error stopping model:', error);
                alert('Failed to stop model: ' + error.response?.data?.error || error.message);
            } finally {
                setLoading(false);
            }
        } else {
            // Start the model
            try {
                setLoading(true);
                const response = await axios.post('/api/run-model');
                
                if (response.data.success) {
                    setIsModelRunning(true);
                } else {
                    alert('Failed to start model: ' + response.data.error);
                }
            } catch (error) {
                console.error('Error starting model:', error);
                alert('Failed to start model: ' + error.response?.data?.error || error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    // Add cleanup function
    const stopModel = useCallback(async () => {
        if (isModelRunning) {
            try {
                await axios.post('/api/stop-model');
                setIsModelRunning(false);
            } catch (error) {
                console.error('Error stopping model:', error);
            }
        }
    }, [isModelRunning]);

    // Add cleanup effect
    useEffect(() => {
        // Cleanup function when component unmounts
        return () => {
            stopModel();
        };
    }, [stopModel]);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await axios.get('/api/config');
            setConfigContent(response.data.config_content);
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    const handleConfigUpdate = async () => {
        try {
            // Get project name from the current URL path
            const projectName = location.pathname.split('/').pop();
            
            await axios.post('/api/config', {
                config_content: configContent,
                project_name: projectName
            });
            alert('Configuration updated successfully!');
        } catch (error) {
            console.error('Failed to update config:', error);
            alert('Failed to update configuration: ' + (error.response?.data?.error || error.message));
        }
    };

    // Add this function to handle log file imports
    const handleImportLogs = async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        try {
            const response = await axios.post('/api/import-logs', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.imported_files?.length > 0) {                
                // Try to determine dimension from first file name
                const firstFile = response.data.imported_files[0];
                const dimensionMatch = firstFile.match(/(\d+)d/);
                if (dimensionMatch) {
                    setSelectedDimension(parseInt(dimensionMatch[1]));
                }
            }

            if (response.data.errors?.length > 0) {
                alert(`Some files had errors:\n${response.data.errors.join('\n')}`);
            }
        } catch (error) {
            console.error('Error importing logs:', error);
            alert('Failed to import logs: ' + (error.response?.data?.error || error.message));
        }
    };

    // Function to categorize logs
    const categorizeLogs = useCallback(() => {
        const modelDir = configContent.match(/file = "models\/(.*?)"/)?.[1];
        if (!modelDir) return;

        // Try to read the data file for this model
        axios.get(`/api/model-data/${modelDir}`)
            .then(response => {
                const modelData = response.data;
                const generatedLogs = modelData.generated_logs || [];
                const trainingLogs = modelData.selected_logs || [];

                // Categorize all logs
                const categorized = {
                    generated: [],
                    training: [],
                    other: []
                };

                logFiles.forEach(log => {
                    if (generatedLogs.includes(log)) {
                        categorized.generated.push(log);
                    } else if (trainingLogs.includes(log)) {
                        categorized.training.push(log);
                    } else {
                        categorized.other.push(log);
                    }
                });

                setCategorizedLogs(categorized);
            })
            .catch(error => {
                console.error('Error fetching model data:', error);
            });
    }, [configContent, logFiles]);

    // Update categorization when logs or config changes
    useEffect(() => {
        categorizeLogs();
    }, [configContent, logFiles, categorizeLogs]);

    // Update the toggleSection function
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
            // Close other sections when opening one
            ...(Object.keys(prev).reduce((acc, key) => {
                if (key !== section) acc[key] = false;
                return acc;
            }, {}))
        }));
    };

    useEffect(() => {
        // Get model name from config
        const modelDir = configContent.match(/file = "models\/(.*?)"/)?.[1];
        if (!modelDir) return;

        // Fetch all data from model-data endpoint
        const fetchModelData = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/api/model-data/${modelDir}`);
                const { generated_logs, selected_logs, all_logs } = response.data;
                
                // Set log files from the response
                setLogFiles(all_logs);
                
                // Categorize logs
                setCategorizedLogs({
                    generated: generated_logs || [],
                    training: selected_logs || [],
                    other: all_logs.filter(log => 
                        !generated_logs.includes(log) && 
                        !selected_logs.includes(log)
                    )
                });

                // Automatically select training logs
                setSelectedLogs(selected_logs || []);

            } catch (error) {
                console.error('Error fetching model data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchModelData();
    }, [configContent]);

    return (
        <Container className="project-container">
            <LogList>
                <Typography variant="h5" gutterBottom>Model Distillation</Typography>
                
                {/* Generated Logs Section */}
                <LogSection>
                    <SectionHeader onClick={() => toggleSection('generated')}>
                        <Typography variant="subtitle1" sx={{ color: '#666666' }}>
                            Logs Generated By This Model ({categorizedLogs.generated.length})
                        </Typography>
                        <ExpandIcon expanded={expandedSections.generated}>▼</ExpandIcon>
                    </SectionHeader>
                    <LogListContent $expanded={expandedSections.generated}>
                        {categorizedLogs.generated.map((file, index) => (
                            <LogItem 
                                key={index} 
                                onClick={() => handleLogClick(file)}
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
                    </LogListContent>
                </LogSection>

                {/* Training Logs Section */}
                <LogSection>
                    <SectionHeader onClick={() => toggleSection('training')}>
                        <Typography variant="subtitle1" sx={{ color: '#666666' }}>
                            Used to Train Current Model ({categorizedLogs.training.length})
                        </Typography>
                        <ExpandIcon expanded={expandedSections.training}>▼</ExpandIcon>
                    </SectionHeader>
                    <LogListContent $expanded={expandedSections.training}>
                        {categorizedLogs.training.map((file, index) => (
                            <LogItem 
                                key={index} 
                                onClick={() => handleLogClick(file)}
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
                    </LogListContent>
                </LogSection>

                {/* Other Logs Section */}
                <LogSection>
                    <SectionHeader onClick={() => toggleSection('other')}>
                        <Typography variant="subtitle1" sx={{ color: '#666666' }}>
                            Other Logs ({categorizedLogs.other.length})
                        </Typography>
                        <ExpandIcon expanded={expandedSections.other}>▼</ExpandIcon>
                    </SectionHeader>
                    <LogListContent $expanded={expandedSections.other}>
                        {categorizedLogs.other.map((file, index) => (
                            <LogItem 
                                key={index} 
                                onClick={() => handleLogClick(file)}
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
                    </LogListContent>
                </LogSection>

                <ButtonContainer>
                    <input
                        type="file"
                        id="log-file-input"
                        multiple
                        accept=".log"
                        style={{ display: 'none' }}
                        onChange={handleImportLogs}
                    />
                    <Button 
                        onClick={() => document.getElementById('log-file-input').click()}
                        variant="contained"
                        size="small"
                        fullWidth
                    >
                        Import
                    </Button>
                    <Button 
                        onClick={handleCreateDataset}
                        variant="contained"
                        size="small"
                        fullWidth
                        disabled={selectedLogs.length === 0}
                    >
                        Train
                    </Button>
                </ButtonContainer>
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
                <RunButtonContainer>
                    <StatusDot isRunning={isModelRunning} />
                    <button 
                        onClick={handleRunClick}
                        disabled={loading}
                        className={isModelRunning ? 'running' : ''}
                    >
                        {isModelRunning ? 'Stop' : 'Run Model'}
                    </button>
                </RunButtonContainer>
            </MainContent>

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
                            Basic Time Series View
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

            <ConfigContainer 
                isOpen={isConfigOpen} 
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX < rect.x) {
                        setIsConfigOpen(!isConfigOpen);
                    }
                }}
            >
                <ConfigTitle>Configuration</ConfigTitle>
                <ConfigCloseButton onClick={() => setIsConfigOpen(false)}>×</ConfigCloseButton>
                <ConfigContent>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        height: '100%',
                        gap: '10px'
                    }}>
                        <Box sx={{ flex: 1 }}>
                            <ConfigTextArea
                                value={configContent}
                                onChange={(e) => setConfigContent(e.target.value)}
                            />
                        </Box>
                    </Box>
                </ConfigContent>
                <SaveButton onClick={handleConfigUpdate}>
                    Save
                </SaveButton>
            </ConfigContainer>

            <Modal
                open={showTrainingDialog}
                onClose={() => setShowTrainingDialog(false)}
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 3,
                    borderRadius: 2,
                }}>
                    <Typography variant="h6" component="h2" gutterBottom sx={{ fontSize: '1.1rem' }}>
                        Dataset created successfully!
                    </Typography>
                    
                    {trainingStats && (
                        <Box sx={{ mt: 1, mb: 2 }}>
                            <Typography sx={{ fontSize: '0.9rem' }}>Total values: {trainingStats.totalValues}</Typography>
                            <Typography sx={{ fontSize: '0.9rem' }}>Total interactions: {trainingStats.totalInteractions}</Typography>
                            <Typography sx={{ fontSize: '0.9rem' }}>Total time: {trainingStats.totalTime.toFixed(2)}s</Typography>
                            <Typography sx={{ fontSize: '0.9rem' }}>Number of performances: {trainingStats.numPerformances}</Typography>
                            <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                                Dataset saved as: <br/>
                                <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 4px' }}>
                                    ./datasets/{trainingStats.datasetFile.split('/').pop()}
                                </code>
                            </Typography>
                        </Box>
                    )}

                    <Typography variant="h6" sx={{ mt: 2, mb: 1, fontSize: '1rem' }}>
                        Training Configuration (Optional)
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Model Size</InputLabel>
                            <Select
                                value={trainingConfig.modelSize}
                                onChange={(e) => setTrainingConfig(prev => ({ ...prev, modelSize: e.target.value }))}
                                label="Model Size"
                            >
                                <MenuItem value="xxs">XXS - Extra Extra Small</MenuItem>
                                <MenuItem value="xs">XS - Extra Small</MenuItem>
                                <MenuItem value="s">S - Small (Default)</MenuItem>
                                <MenuItem value="m">M - Medium</MenuItem>
                                <MenuItem value="l">L - Large</MenuItem>
                                <MenuItem value="xl">XL - Extra Large</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={trainingConfig.earlyStoppingEnabled}
                                    onChange={(e) => setTrainingConfig(prev => ({ 
                                        ...prev, 
                                        earlyStoppingEnabled: e.target.checked 
                                    }))}
                                    size="small"
                                />
                            }
                            label="Early Stopping"
                        />

                        {trainingConfig.earlyStoppingEnabled && (
                            <TextField
                                size="small"
                                type="number"
                                label="Patience"
                                value={trainingConfig.patience}
                                onChange={(e) => setTrainingConfig(prev => ({ 
                                    ...prev, 
                                    patience: parseInt(e.target.value) 
                                }))}
                                helperText="Number of epochs to wait before early stopping"
                            />
                        )}

                        <TextField
                            size="small"
                            type="number"
                            label="Number of Epochs"
                            value={trainingConfig.numEpochs}
                            onChange={(e) => setTrainingConfig(prev => ({ 
                                ...prev, 
                                numEpochs: parseInt(e.target.value) 
                            }))}
                        />

                        <TextField
                            size="small"
                            type="number"
                            label="Batch Size"
                            value={trainingConfig.batchSize}
                            onChange={(e) => setTrainingConfig(prev => ({ 
                                ...prev, 
                                batchSize: parseInt(e.target.value) 
                            }))}
                        />

                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleStartTraining}
                                sx={{ flex: 1 }}
                            >
                                Start Training
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Modal>

            {showTrainingVisualizer && (
                <>
                    <TrainingVisualizer
                        onClose={() => setShowTrainingVisualizer(false)}
                    />
                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                        sx={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            zIndex: 1001,
                            backgroundColor: 'white',
                            color: '#333',
                            '&:hover': {
                                backgroundColor: '#f0f0f0',
                            },
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                    >
                        Go to Home
                    </Button>
                </>
            )}
        </Container>
    );
}

export default Project;
