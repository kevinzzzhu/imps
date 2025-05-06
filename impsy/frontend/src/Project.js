import React, { useEffect, useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Typography, List, ListItem, Box, Modal, Paper, Button, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, TextField, Snackbar, Alert } from '@mui/material';
import InputVis from './components/project/InputVis';
import OutputVis from './components/project/OutputVis';
import TimeSeriesGraph from './components/logVis/TimeSeriesGraph';
// import SplomGraph from './components/logVis/SplomGraph';
import ParallelGraph from './components/logVis/ParallelGraph';
// import ViolinGraph from './components/logVis/ViolinGraph';
// import OscillationGraph from './components/logVis/OscillationGraph';
import { useLocation, useNavigate } from 'react-router-dom';
import TrainingVisualizer from './components/home/TrainingVisualizer';
import CreativeBackground from './components/project/BackgroundVis';

const Container = styled.div`
    display: flex;
    height: 100vh;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.8s ease;
    position: relative;
    overflow: hidden;
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
    transition: opacity 0.5s ease-out, transform 0.5s ease-out;
    opacity: ${props => props.isHidden ? 0 : 1};
    transform: ${props => props.isHidden ? 'translateX(-350px)' : 'translateX(0)'};
    pointer-events: ${props => props.isHidden ? 'none' : 'auto'};
    z-index: ${props => props.isHidden ? -1 : 5};
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
    transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1);
    transform: ${props => props.expanded ? 'translateX(-10%)' : 'translateX(0)'};
    margin-left: ${props => props.expanded ? 'auto' : '0'};
    margin-right: ${props => props.expanded ? 'auto' : '0'};
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

const DeleteButton = styled.button`
    background: transparent;
    color: #aaa;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    margin-left: auto;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    opacity: 0.6;

    &:hover {
        color: #e74c3c;
        opacity: 1;
        background: rgba(0, 0, 0, 0.05);
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

function Project({ onModelRunningChange }) {
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
    const [selectedView, setSelectedView] = useState('TimeSeries');
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
    const [midiMapping, setMidiMapping] = useState({
        dimension: 0,
        ccToIndexMap: {}
    });
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

    // Add new state variables for error handling
    const [modelError, setModelError] = useState(null);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [healthCheckInterval, setHealthCheckInterval] = useState(null);

    // Add this useEffect to automatically select training logs
    useEffect(() => {
        if (categorizedLogs.training.length > 0) {
            setSelectedLogs(prev => [
                ...new Set([...prev, ...categorizedLogs.training])
            ]);
        }
    }, [categorizedLogs.training]);

    useEffect(() => {
        // WebSocket connection with reconnection logic
        let ws = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const reconnectInterval = 3000; // 3 seconds
        
        const connectWebSocket = () => {
            // Close existing connection if any
            if (ws) {
                ws.close();
            }
            
            console.log('Connecting to WebSocket server...');
            ws = new WebSocket('ws://localhost:8080');
            
            ws.onopen = () => {
                console.log('Connected to WebSocket server');
                reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            };
    
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'input') {
                        setInputData(message.data);
                    } else if (message.type === 'output') {
                        setOutputData(message.data);
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error, 'Raw data:', event.data);
                }
            };
    
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
    
            ws.onclose = (event) => {
                console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
                
                // Try to reconnect unless max attempts reached or component unmounting
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                    setTimeout(connectWebSocket, reconnectInterval);
                } else {
                    console.log('Max reconnection attempts reached. Giving up.');
                }
            };
        };
        
        // Initial connection
        connectWebSocket();
    
        // Cleanup
        return () => {
            if (ws && [WebSocket.CONNECTING, WebSocket.OPEN].includes(ws.readyState)) {
                console.log('Closing WebSocket connection due to component unmount');
                // Set a flag to prevent reconnection attempts
                reconnectAttempts = maxReconnectAttempts;
                ws.close();
            }
        };
    }, []);

    // Add useEffect to ensure loading state is reset
    useEffect(() => {
        // Set a timeout to ensure loading state is reset even if other operations fail
        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000); // 3 second timeout as a fallback
        
        return () => clearTimeout(timer);
    }, []);

    // Add useEffect to fetch config and parse MIDI mapping
    useEffect(() => {
        const fetchConfigAndParseMidiMapping = async () => {
            try {
                const response = await axios.get('/api/config');
                const configContent = response.data.config_content;
                setConfigContent(configContent);
                
                // Get dimension from config instead of hardcoding
                const dimensionMatch = configContent.match(/dimension\s*=\s*(\d+)/);
                let dimension = (dimensionMatch ? parseInt(dimensionMatch[1]) : 15) - 1;
                
                const ccToIndexMap = {};
                
                // Parse config line by line
                const configLines = configContent.split('\n');
                let inMidiInputSection = false;
                let inputIndex = 0;
                
                // Process each line in the config
                configLines.forEach(line => {
                    const trimmedLine = line.trim();
                    
                    // Check if we're entering the MIDI input section
                    if (trimmedLine === 'input = [') {
                        inMidiInputSection = true;
                        inputIndex = 0; // Start at index 0
                        return;
                    }
                    
                    // Check if we're exiting the MIDI input section
                    if (inMidiInputSection && trimmedLine === ']') {
                        inMidiInputSection = false;
                        return;
                    }
                    
                    // Process lines within the MIDI input section
                    if (inMidiInputSection && trimmedLine.length > 1 && !trimmedLine.startsWith('#')) {
                        if (trimmedLine.includes('control_change')) {
                            // Extract the CC number - get the third parameter in the array
                            const parameters = trimmedLine.match(/\[([^\]]+)\]/);
                            if (parameters) {
                                const parts = parameters[1].split(',').map(p => p.trim());
                                if (parts.length >= 3) {
                                    const cc = parseInt(parts[2]);
                                    if (!isNaN(cc)) {
                                        ccToIndexMap[cc.toString()] = inputIndex;
                                    }
                                }
                            }
                        }
                        
                        // Increment regardless of message type (note_on or control_change)
                        if (inputIndex < dimension - 1) { // Ensure we don't exceed dimension-1
                            inputIndex++;
                        }
                    }
                });
                
                // Only fall back to default if no mappings found
                if (Object.keys(ccToIndexMap).length === 0) {
                    for (let i = 0; i < dimension - 1; i++) {
                        ccToIndexMap[(16 + i).toString()] = i + 1;
                    }
                }
                
                // Ensure inputData has the correct dimension
                setInputData(Array(dimension).fill(0));
                
                setMidiMapping({
                    dimension,
                    ccToIndexMap
                });
                
            } catch (error) {
                console.error('Failed to fetch config:', error);
            }
        };

        fetchConfigAndParseMidiMapping();
    }, []);

    // Effect to handle MIDI input
    useEffect(() => {
        let midiAccess = null;
        let inputDevice = null;

        // Reinitialize input data with correct dimension if needed
        if (midiMapping.dimension > 0 && 
            (!inputData || inputData.length !== midiMapping.dimension)) {
            setInputData(Array(midiMapping.dimension).fill(0));
        }

        const onMIDIMessage = (event) => {
            const [status, data1, data2] = event.data;
            const command = status & 0xf0; // Get command type (e.g., 0xB0 for Control Change)

            // Uncomment to debug all MIDI messages (might cause console spam)
            // console.log(`MIDI Message: status=${status.toString(16)}, data1=${data1}, data2=${data2}`);

            // Fix the log input values function to use dynamic dimension
            const logInputValues = (newInputData) => {
                if (!newInputData || !Array.isArray(newInputData)) {
                    console.log("logInputValues: Invalid data", newInputData);
                    return;
                }
                
                const dimension = newInputData.length;
                // The slice and while loop for fixedSizeArray are a bit redundant if just logging.
                // We can directly map over newInputData.
                const valuesString = newInputData.map(val => 
                    val !== undefined ? val.toFixed(3) : '0.000' // Using 3 decimal places
                ).join(', ');
                console.log(`MIDI Input Updated (dim: ${dimension}): [${valuesString}]`);
            };

            // Ensure inputData is an array (though it should be by now due to earlier effects)
            if (!Array.isArray(inputData)) { // Simplified check
                console.warn("onMIDIMessage: inputData is not an array.", inputData);
                return;
            }

            // Check if MIDI mapping is initialized
            if (!midiMapping || !midiMapping.ccToIndexMap || midiMapping.dimension === 0) {
                console.warn("onMIDIMessage: MIDI mapping not ready.", midiMapping);
                return;
            }

            // Handle different message types
            if (command === 0xB0) {
                // Control Change messages
                const controllerNumber = data1;
                const controllerValue = data2;
                const normalizedValue = controllerValue / 127.0; // Normalize to 0.0 - 1.0
                const ccStr = controllerNumber.toString();
                const targetIndex = midiMapping.ccToIndexMap[ccStr];

                if (targetIndex !== undefined) {
                    setInputData(prevInputData => {
                        let newArr = Array(midiMapping.dimension).fill(0);
                        // If prevInputData was the correct MIDI dimension, copy its values.
                        if (prevInputData && prevInputData.length === midiMapping.dimension) {
                            newArr = [...prevInputData];
                        }
                        // Else, we start with a fresh zeroed array of the correct dimension.

                        if (targetIndex < midiMapping.dimension) { // Ensure targetIndex is valid
                            newArr[targetIndex] = normalizedValue;
                        }
                        logInputValues(newArr);
                        return newArr;
                    });
                }
            } else if (command === 0x90) {
                // Note On message
                const noteNumber = data1;
                const velocity = data2;
                
                if (velocity === 0) { // Note Off
                    return;
                }
                
                const normalizedNote = noteNumber / 127.0;
                
                setInputData(prevInputData => {
                    let newArr = Array(midiMapping.dimension).fill(0);
                    if (prevInputData && prevInputData.length === midiMapping.dimension) {
                        newArr = [...prevInputData];
                    }

                    // In config.toml, note_on is mapped to index 0
                    if (midiMapping.dimension > 0) { // Ensure dimension is at least 1 for index 0
                        newArr[0] = normalizedNote;
                    }
                    
                    logInputValues(newArr);
                    return newArr;
                });
                
            } else if (command === 0x80) {
                // Note Off message
                const noteNumber = data1;
            }
        };

        const setupMIDI = async () => {
            // Add a small delay to ensure config is fully loaded
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (navigator.requestMIDIAccess) {
                try {
                    midiAccess = await navigator.requestMIDIAccess();
                    
                    // Parse the config to get the specified MIDI device
                    const midiInDeviceMatch = configContent.match(/in_device\s*=\s*"([^"]*)"/);
                    const targetDeviceName = midiInDeviceMatch ? midiInDeviceMatch[1] : "Minilab3 MIDI";
                    
                    // Get all available input devices
                    const inputs = Array.from(midiAccess.inputs.values());
                    
                    // Try to find the device specified in config
                    const configuredDevice = inputs.find(device => 
                        device.name.includes(targetDeviceName)
                    );
                    
                    if (configuredDevice) {
                        // Use the device specified in config
                        inputDevice = configuredDevice;
                        console.log(`Using configured MIDI device: ${inputDevice.name}`);
                    } else {
                        // Fall back to any available device if specified one not found
                        inputDevice = inputs[0];
                        if (inputDevice) {
                            console.log(`Configured device "${targetDeviceName}" not found. Using: ${inputDevice.name}`);
                        } else {
                            console.log('No MIDI input devices found.');
                        }
                    }

                    if (inputDevice) {
                        inputDevice.onmidimessage = onMIDIMessage;
                    }

                } catch (error) {
                    console.error('Failed to get MIDI access:', error);
                }
            } else {
                console.log('Web MIDI API not supported in this browser.');
            }
        };

        setupMIDI();

        // Cleanup function
        return () => {
            console.log("MIDI Setup Effect: Cleaning up");
            if (inputDevice) {
                inputDevice.onmidimessage = null; // Remove listener
                console.log('MIDI listener removed.');
            }
            // Note: Closing midiAccess itself isn't standard practice or necessary
        };
    }, [midiMapping, configContent]);

    // Ensure we initialize MIDI after config is loaded and parsed
    useEffect(() => {
        // Wait a bit to ensure midiMapping is initialized
        const timer = setTimeout(() => {
            if (midiMapping.dimension > 0) {
                console.log(`MIDI mapping initialized with dimension ${midiMapping.dimension}`);
                console.log('MIDI CC to Index map:', midiMapping.ccToIndexMap);
            }
        }, 2000);
        
        return () => clearTimeout(timer);
    }, [midiMapping]);

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

    // Add effect to notify parent when modelRunning state changes
    useEffect(() => {
        if (onModelRunningChange) {
            onModelRunningChange(isModelRunning);
        }
    }, [isModelRunning, onModelRunningChange]);

    // Add cleanup function
    const stopModel = useCallback(async () => {
        if (isModelRunning) {
            try {
                await axios.post('/api/stop-model');
                setIsModelRunning(false);
                if (onModelRunningChange) {
                    onModelRunningChange(false);
                }
            } catch (error) {
                console.error('Error stopping model:', error);
            }
        }
    }, [isModelRunning, onModelRunningChange]);

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
        } finally {
            setLoading(false); // Ensure loading is set to false after config fetching
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
        if (!modelDir) {
            setLoading(false); // Ensure loading is set to false even if no model dir is found
            return;
        }

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

    // handle log file deletion
    const handleDeleteLog = async (filename, event) => {
        event.stopPropagation(); // Prevent log selection when clicking delete
        
        if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
            try {
                const response = await axios.delete(`/api/logs/${filename}`);
                if (response.data.success) {
                    // Remove from selected logs if it was selected
                    if (selectedLogs.includes(filename)) {
                        setSelectedLogs(prev => prev.filter(f => f !== filename));
                    }
                    
                    // Clear selected log if it was the one being viewed
                    if (selectedLog === filename) {
                        setSelectedLog(null);
                        setLogContent('');
                        setLogData(null);
                        setModalOpen(false);
                    }
                    
                    // Update categorized logs
                    setCategorizedLogs(prev => {
                        const newCategorized = { ...prev };
                        Object.keys(newCategorized).forEach(category => {
                            newCategorized[category] = newCategorized[category].filter(
                                log => log !== filename
                            );
                        });
                        return newCategorized;
                    });
                    
                    // Refresh the log files list by re-fetching model data
                    categorizeLogs();
                } else {
                    alert(`Error: ${response.data.error}`);
                }
            } catch (error) {
                console.error('Failed to delete log file:', error);
                alert(`Failed to delete log file: ${error.message}`);
            }
        }
    };

    // Update the handleRunClick function
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
                    if (onModelRunningChange) {
                        onModelRunningChange(true);
                    }
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

    // Add model health check effect
    useEffect(() => {
        let intervalId = null;

        // Start health check polling when model is running
        if (isModelRunning) {
            intervalId = setInterval(async () => {
                try {
                    console.log("Checking model status...");
                    const response = await axios.get('/api/model-status');
                    
                    // If model was running but has stopped unexpectedly
                    if (!response.data.running && isModelRunning) {
                        console.log("Model stopped unexpectedly:", response.data);
                        
                        // Set error message
                        const errorMsg = response.data.message || "Model stopped unexpectedly";
                        setModelError(errorMsg);
                        setShowErrorAlert(true);
                        
                        // Update state to reflect model has stopped
                        setIsModelRunning(false);
                        if (onModelRunningChange) {
                            onModelRunningChange(false);
                        }
                    }
                } catch (error) {
                    console.error("Error checking model status:", error);
                    // If we can't check the status, assume model has crashed
                    if (isModelRunning) {
                        setModelError("Failed to check model status. The model may have crashed.");
                        setShowErrorAlert(true);
                        setIsModelRunning(false);
                        if (onModelRunningChange) {
                            onModelRunningChange(false);
                        }
                    }
                }
            }, 5000); // Check every 5 seconds
            
            setHealthCheckInterval(intervalId);
        } else if (intervalId) {
            // Clear interval if model is no longer running
            clearInterval(intervalId);
            setHealthCheckInterval(null);
        }
        
        // Cleanup function
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isModelRunning, onModelRunningChange]);

    // Add cleanup effect for health check interval
    useEffect(() => {
        return () => {
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
            }
        };
    }, [healthCheckInterval]);

    // Add handler for error alert close
    const handleErrorAlertClose = () => {
        setShowErrorAlert(false);
    };

    return (
        <Container className="project-container">
            <CreativeBackground 
                inputData={inputData} 
                outputData={outputData} 
                isModelRunning={isModelRunning}
            />
            
            <LogList isHidden={isModelRunning}>
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
                                <DeleteButton 
                                    onClick={(e) => handleDeleteLog(file, e)}
                                    title="Delete log file"
                                >
                                    ×
                                </DeleteButton>
                            </LogItem>
                        ))}
                    </LogListContent>
                </LogSection>

                {/* Training Logs Section */}
                <LogSection>
                    <SectionHeader onClick={() => toggleSection('training')}>
                        <Typography variant="subtitle1" sx={{ color: '#666666' }}>
                            Files Used to Train This Model ({categorizedLogs.training.length})
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
                                <DeleteButton 
                                    onClick={(e) => handleDeleteLog(file, e)}
                                    title="Delete log file"
                                >
                                    ×
                                </DeleteButton>
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
                                <DeleteButton 
                                    onClick={(e) => handleDeleteLog(file, e)}
                                    title="Delete log file"
                                >
                                    ×
                                </DeleteButton>
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

            <MainContent expanded={isModelRunning}>
                <Typography 
                    variant="h4" 
                    gutterBottom
                    sx={{
                        transition: 'opacity 0.5s ease',
                        opacity: isModelRunning ? 0.2 : 1
                    }}
                >
                    IMPSY Visualization
                </Typography>
                <div 
                    style={{ 
                        display: 'flex', 
                        width: '100%', 
                        justifyContent: 'space-evenly',
                        transition: 'transform 0.5s ease, margin-top 0.5s ease',
                        marginTop: isModelRunning ? '50px' : '0'
                    }}
                >
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <InputVis data={inputData}/>
                        <Typography 
                            variant="subtitle1"
                            sx={{ transition: 'opacity 0.5s ease', opacity: isModelRunning ? 0.6 : 1 }}
                        >
                            Input
                        </Typography>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <OutputVis data={outputData}/>
                        <Typography 
                            variant="subtitle1"
                            sx={{ transition: 'opacity 0.5s ease', opacity: isModelRunning ? 0.6 : 1 }}
                        >
                            Output
                        </Typography>
                    </div>
                </div>
                <RunButtonContainer>
                    <StatusDot isRunning={isModelRunning} />
                    <button 
                        onClick={handleRunClick}
                        disabled={loading}
                        className={isModelRunning ? 'running' : ''}
                        style={{
                            backgroundColor: isModelRunning ? '#e74c3c' : '#808080'
                        }}
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
                            variant={selectedView === 'TimeSeries' ? 'contained' : 'outlined'} 
                            onClick={() => setSelectedView('TimeSeries')}
                        >
                            TimeSeries View
                        </Button>
                        {/* <Button
                            variant={selectedView === 'splom' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('splom')}
                        >
                            Splom View
                        </Button> */}
                        <Button
                            variant={selectedView === 'parallel' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('parallel')}
                        >
                            Parallel View
                        </Button>
                        {/* <Button
                            variant={selectedView === 'violin' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('violin')}
                        >
                            Violin View
                        </Button> */}
                        {/* <Button
                            variant={selectedView === 'oscillation' ? 'contained' : 'outlined'}
                            onClick={() => setSelectedView('oscillation')}
                        >
                            Oscillation View
                        </Button> */}
                    </Box>

                    {/* Conditional rendering based on selected view */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>                        
                        {selectedView === 'TimeSeries' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>TimeSeries View</Typography>
                                {logData && <TimeSeriesGraph data={logData} />}
                            </Box>
                        )}

                        {/* {selectedView === 'splom' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Splom View</Typography>
                                {logData && <SplomGraph data={logData} />}
                            </Box>
                        )} */}

                        {selectedView === 'parallel' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Parallel View</Typography>
                                {logData && <ParallelGraph data={logData} />}
                            </Box>
                        )}

                        {/* {selectedView === 'violin' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Violin View</Typography>
                                {logData && <ViolinGraph data={logData} />}
                            </Box>
                        )} */}

                        {/* {selectedView === 'oscillation' && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom>Oscillation View</Typography>
                                {logData && <OscillationGraph data={logData} />}
                            </Box>
                        )} */}
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
                        borderRadius: '4px',
                        overflowX: 'auto',
                        maxWidth: '100%',
                        wordBreak: 'break-all'
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

            {/* Add Snackbar for error alerts */}
            <Snackbar 
                open={showErrorAlert} 
                autoHideDuration={6000} 
                onClose={handleErrorAlertClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleErrorAlertClose} 
                    severity="error" 
                    sx={{ width: '100%', maxWidth: '500px' }}
                >
                    <Box>
                        <Typography variant="subtitle1">Model Error</Typography>
                        <Typography variant="body2">{modelError}</Typography>
                    </Box>
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default Project;
