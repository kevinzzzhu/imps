import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Typography, List, ListItem, Box, Modal, Paper, Button, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, TextField } from '@mui/material';
import { Audio } from 'react-loader-spinner';
import TimeSeriesGraph from '../logVis/TimeSeriesGraph';
import DelaunayGraph from '../logVis/DelaunayGraph';
import SplomGraph from '../logVis/SplomGraph';
import ParallelGraph from '../logVis/ParallelGraph';
import ViolinGraph from '../logVis/ViolinGraph';
import OscillationGraph from '../logVis/OscillationGraph';

const Container = styled.div`
    display: flex;
    height: 100vh;
    justify-content: flex-start;
    align-items: center;
    background: transparent;
    padding: 0 20px;
    position: relative;
    transition: transform 0.5s ease-out;
    transform: ${props => props.isTraining ? 'translateX(-20%)' : 'translateX(0)'};
`;

const LogList = styled.div`
    width: 300px;
    background-color: rgba(44, 62, 80, 0.7);
    padding: 20px;
    flex-shrink: 0;
    height: 80vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: absolute; 
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    backdrop-filter: blur(8px);
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
`;

const LogListContent = styled.div`
    overflow-y: auto;
    flex-grow: 1;
    
    /* Hide scrollbar */
    &::-webkit-scrollbar {
        display: none;
    }
    -ms-overflow-style: none;
    scrollbar-width: none;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 10px;
    padding: 0 10px;

    button {
        flex: 1;
        padding: 6px 12px !important;
        font-size: 0.9rem !important;
        min-height: 32px !important;
        text-transform: none;
        background-color: rgba(52, 152, 219, 0.9);
        
        &:hover {
            background-color: rgba(52, 152, 219, 1);
        }
        
        &:disabled {
            background-color: rgba(52, 152, 219, 0.5);
        }
    }
`;

const MainContent = styled.div`
    flex-grow: 1;
    height: 80vh;
    margin-left: 320px;
    background-color: rgba(44, 62, 80, 0.7);
    backdrop-filter: blur(8px);
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: ${props => props.show ? 1 : 0};
    transform: translateX(${props => props.show ? '0' : '-20px'});
    transition: all 0.3s ease;
    visibility: ${props => props.show ? 'visible' : 'hidden'};
`;

const LogContent = styled.div`
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    padding: 20px;
    
    /* Hide scrollbar */
    &::-webkit-scrollbar {
        display: none;
    }
    -ms-overflow-style: none;
    scrollbar-width: none;
`;

const LogItem = styled.div`
    padding: 10px;
    margin: 5px;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s ease;
    word-break: break-word;

    &:hover {
        background-color: rgba(255, 255, 255, 0.2);
        transform: translateX(-2px);
    }

    input[type="checkbox"] {
        cursor: pointer;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        accent-color: #3498db;
    }
`;

const StyledTypography = styled(Typography)`
    color: white !important;
    margin-bottom: 10px !important;
`;

const TitleContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

const FilterButton = styled.button`
    background: rgba(52, 152, 219, 0.9);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    margin-bottom: 10px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(52, 152, 219, 1);
        transform: translateY(-1px);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const FilterMenu = styled.div`
    position: absolute;
    top: 20px;
    right: -150px;
    background: rgba(44, 62, 80, 0.95);
    border-radius: 4px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    /* Animation properties */
    opacity: ${props => props.show ? 1 : 0};
    transform: translateX(${props => props.show ? '0' : '-10px'});
    visibility: ${props => props.show ? 'visible' : 'hidden'};
    transition: all 0.3s ease-in-out;
    transform-origin: top right;
    pointer-events: ${props => props.show ? 'auto' : 'none'};
`;

const FilterSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;

    label {
        color: white;
        font-size: 0.9rem;
    }

    select, input {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 5px;
        color: white;
        font-size: 0.9rem;

        &:focus {
            outline: none;
            border-color: rgba(52, 152, 219, 0.8);
        }
    }

    input[type="number"] {
        width: 80px;
    }
`;

const NoFilesMessage = styled.div`
    color: white;
    font-size: 1rem;
    text-align: center;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    padding: 20px;
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

const LeftSide = ({ onTrainingStart }) => {
    const [logFiles, setLogFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [logContent, setLogContent] = useState('');
    const [logData, setLogData] = useState(null);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [selectedView, setSelectedView] = useState('basic');
    const [selectedDimension, setSelectedDimension] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        dimension: 'all',
        timeRange: 'all',
        customStartDate: '',
        customEndDate: '',
        customDimension: ''
    });
    const [showTrainingDialog, setShowTrainingDialog] = useState(false);
    const [trainingStats, setTrainingStats] = useState(null);
    const [trainingConfig, setTrainingConfig] = useState({
        modelSize: 's',
        earlyStoppingEnabled: true,
        patience: 10,
        numEpochs: 100,
        batchSize: 64
    });

    useEffect(() => {
        fetchLogFiles();
    }, []);
    
    const fetchLogFiles = async () => {
        try {
            const response = await axios.get('/api/logs');
            setLogFiles(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch log files:', error);
            setLoading(false);
        }
    };

    // Add function to fetch log content
    const fetchLogContent = async (filename) => {
        try {
            setLogContent("Loading..."); 
            
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
        // Extract dimension from filename (e.g., "4d" from "2024-08-06T01-15-57-4d-mdrnn.log")
        const dimensionMatch = filename.match(/(\d+)d-mdrnn\.log$/);
        const fileDimension = dimensionMatch ? dimensionMatch[1] : null;
        
        setSelectedLogs(prev => {
            if (prev.includes(filename)) {
                // Unchecking a file
                const newSelection = prev.filter(f => f !== filename);
                // If no files are selected, reset selectedDimension
                if (newSelection.length === 0) {
                    setSelectedDimension(null);
                }
                return newSelection;
            } else {
                // Checking a file
                if (selectedDimension === null) {
                    // First selection
                    setSelectedDimension(fileDimension);
                    return [...prev, filename];
                } else if (fileDimension === selectedDimension) {
                    // Same dimension as already selected
                    return [...prev, filename];
                } else {
                    // Different dimension - don't allow selection
                    alert(`Can only select log files with ${selectedDimension}D. This file is ${fileDimension}D.`);
                    return prev;
                }
            }
        });
    };

    // Rename the function to be more descriptive
    const handleCreateDataset = async () => {
        try {
            const response = await axios.post('/api/create-dataset', {  // renamed endpoint
                logFiles: selectedLogs
            });
            
            if (response.data.status === 'success') {
                setTrainingStats({
                    totalValues: response.data.stats.total_values,
                    totalInteractions: response.data.stats.total_interactions,
                    totalTime: response.data.stats.total_time,
                    numPerformances: response.data.stats.num_performances,
                    datasetFile: response.data.dataset_file
                });
                setShowTrainingDialog(true);
            }
        } catch (error) {
            console.error('Failed to create dataset:', error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const parseFileDate = (filename) => {
        const match = filename.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})/);
        if (match) {
            const [_, date, time] = match;
            const formattedTime = time.replace(/-/g, ':');
            return new Date(`${date}T${formattedTime}`);
        }
        return null;
    };

    const isWithinTimeRange = (fileDate, range) => {
        if (!fileDate) return false;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (range) {
            case 'today':
                return fileDate >= today;
            case 'week':
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                return fileDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                return fileDate >= monthAgo;
            case 'custom':
                const start = filters.customStartDate ? new Date(filters.customStartDate) : null;
                const end = filters.customEndDate ? new Date(filters.customEndDate) : null;
                if (start && end) {
                    return fileDate >= start && fileDate <= end;
                }
                return true;
            default:
                return true;
        }
    };

    const filteredLogFiles = logFiles.filter(file => {
        let pass = true;
        
        // Filter by dimension
        if (filters.dimension !== 'all') {
            const dimensionMatch = file.match(/(\d+)d-mdrnn\.log$/);
            const fileDimension = dimensionMatch ? dimensionMatch[1] : null;
            if (filters.dimension === 'custom') {
                pass = pass && fileDimension === filters.customDimension;
            } else {
                pass = pass && fileDimension === filters.dimension;
            }
        }

        // Filter by time range
        if (filters.timeRange !== 'all') {
            const fileDate = parseFileDate(file);
            pass = pass && isWithinTimeRange(fileDate, filters.timeRange);
        }

        return pass;
    });

    // Separate close and train actions
    const handleModalClose = () => {
        setShowTrainingDialog(false);
    };

    const handleStartTraining = async () => {
        setShowTrainingDialog(false);
        
        if (onTrainingStart) {
            onTrainingStart();
        }
        
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
        }
    };

    const handleImportLogs = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }

        try {
            const response = await axios.post('/api/import-logs', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.imported_files.length > 0) {
                alert(`Successfully imported ${response.data.imported_files.length} log files`);
                fetchLogFiles(); // Refresh the list
            }

            if (response.data.errors.length > 0) {
                alert('Errors occurred:\n' + response.data.errors.join('\n'));
            }
        } catch (error) {
            alert('Failed to import log files: ' + (error.response?.data?.error || error.message));
        }
    };

    return (
        <Container>
            <LogList>
                <TitleContainer>
                    <StyledTypography variant="h6" gutterBottom>
                        Select Log Files
                    </StyledTypography>
                    <FilterButton onClick={() => setShowFilters(!showFilters)}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
                        </svg>
                        Filter
                    </FilterButton>
                </TitleContainer>

                <FilterMenu show={showFilters}>
                    <FilterSection>
                        <label>Dimension</label>
                        <select 
                            value={filters.dimension}
                            onChange={(e) => {
                                handleFilterChange('dimension', e.target.value);
                                if (e.target.value !== 'custom') {
                                    handleFilterChange('customDimension', '');
                                }
                            }}
                        >
                            <option value="all">All Dimensions</option>
                            <option value="2">2D</option>
                            <option value="4">4D</option>
                            <option value="9">9D</option>
                            <option value="custom">Custom...</option>
                        </select>
                        {filters.dimension === 'custom' && (
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={filters.customDimension}
                                onChange={(e) => handleFilterChange('customDimension', e.target.value)}
                                placeholder="Enter dimension"
                            />
                        )}
                    </FilterSection>
                    <FilterSection>
                        <label>Time Range</label>
                        <select 
                            value={filters.timeRange}
                            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        {filters.timeRange === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    value={filters.customStartDate}
                                    onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                                    placeholder="Start Date"
                                />
                                <input
                                    type="date"
                                    value={filters.customEndDate}
                                    onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                                    placeholder="End Date"
                                />
                            </>
                        )}
                    </FilterSection>
                </FilterMenu>

                <LogListContent>
                    {loading ? (
                        <Audio height="80" width="80" color="green" ariaLabel="loading" />
                    ) : filteredLogFiles.length > 0 ? (
                        <List>
                            {filteredLogFiles.map((file, index) => {
                                const dimensionMatch = file.match(/(\d+)d-mdrnn\.log$/);
                                const fileDimension = dimensionMatch ? dimensionMatch[1] : null;
                                const isDisabled = selectedDimension !== null && fileDimension !== selectedDimension;
                                
                                return (
                                    <LogItem 
                                        key={index} 
                                        onClick={() => handleLogClick(file)}
                                        style={{ 
                                            cursor: 'pointer',
                                            opacity: isDisabled ? 0.5 : 1 
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedLogs.includes(file)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleCheckboxChange(file);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={isDisabled}
                                            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                        />
                                        {file}
                                    </LogItem>
                                );
                            })}
                        </List>
                    ) : (
                        <NoFilesMessage>
                            No log files found.
                        </NoFilesMessage>
                    )}
                </LogListContent>
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

            <MainContent show={selectedLog !== null}>
                {selectedLog && (
                    <LogContent>
                        <Typography variant="h6" style={{ color: 'white' }}>
                            {selectedLog}
                        </Typography>

                        {/* View selector buttons */}
                        <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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

                        {/* Visualization views */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {selectedView === 'basic' && (
                                <Box>
                                    <Typography variant="subtitle1" style={{ color: 'white' }}>
                                        Basic View
                                    </Typography>
                                    {logData && <TimeSeriesGraph data={logData} />}
                                </Box>
                            )}
                            {selectedView === 'delaunay' && (
                                <Box>
                                    <Typography variant="subtitle1" style={{ color: 'white' }}>
                                        Delaunay View
                                    </Typography>
                                    {logData && <DelaunayGraph data={logData} />}
                                </Box>
                            )}
                            {selectedView === 'splom' && (
                                <Box>
                                    <Typography variant="subtitle1" style={{ color: 'white' }}>
                                        Splom View
                                    </Typography>
                                    {logData && <SplomGraph data={logData} />}
                                </Box>
                            )}
                            {selectedView === 'parallel' && (
                                <Box>
                                    <Typography variant="subtitle1" style={{ color: 'white' }}>
                                        Parallel View
                                    </Typography>
                                    {logData && <ParallelGraph data={logData} />}
                                </Box>
                            )}
                            {selectedView === 'violin' && (
                                <Box>
                                    <Typography variant="subtitle1" style={{ color: 'white' }}>
                                        Violin View
                                    </Typography>
                                    {logData && <ViolinGraph data={logData} />}
                                </Box>
                            )}
                            {selectedView === 'oscillation' && (
                                <Box>
                                    <Typography variant="subtitle1" style={{ color: 'white' }}>
                                        Oscillation View
                                    </Typography>
                                    {logData && <OscillationGraph data={logData} />}
                                </Box>
                            )}
                        </Box>

                        {/* Raw data */}
                        <Box>
                            <Typography variant="subtitle1" style={{ color: 'white' }}>
                                Raw Data
                            </Typography>
                            <Box sx={{ 
                                whiteSpace: 'pre-wrap', 
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                padding: '15px',
                                borderRadius: '4px',
                                color: 'white'
                            }}>
                                {logContent}
                            </Box>
                        </Box>
                    </LogContent>
                )}
            </MainContent>

            {/* Training Started Dialog */}
            <Modal
                open={showTrainingDialog}
                onClose={handleModalClose}
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

                        <FormControlLabel sx={{ marginLeft: '0px' }}
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
                            label={<Typography sx={{ fontSize: '0.9rem' }}>Early Stopping</Typography>}
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
                    </Box>

                    <Button 
                        onClick={handleStartTraining}
                        variant="contained"
                        sx={{ mt: 2 }}
                        fullWidth
                        size="small"
                    >
                        Start Training
                    </Button>
                </Box>
            </Modal>
        </Container>
    );
}

export default LeftSide;