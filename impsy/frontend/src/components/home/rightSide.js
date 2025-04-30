import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Typography, Modal, Button, Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Audio } from 'react-loader-spinner';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Title,
    Tooltip,
    Legend
);

const Container = styled.div`
    display: flex;
    height: 100vh;
    justify-content: flex-start;
    align-items: center;
    background: transparent;
    padding: 0 20px;
    position: relative;
    transition: transform 0.5s ease-out;
`;

const ModelList = styled.div`
    width: ${props => props.isExtended ? 'calc(100% - 40px)' : '300px'};
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
    transition: width 0.3s ease-out;
    z-index: 10;
`;

const TitleContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    position: relative;
`;

const StyledTypography = styled(Typography)`
    color: white !important;
    margin-bottom: 10px !important;
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
    top: 80px;
    right: ${props => props.isExtended ? '130px' : '-150px'};
    left: ${props => props.isExtended ? 'auto' : 'auto'};
    background: rgba(44, 62, 80, 0.95);
    border-radius: 4px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 200000;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    /* Animation properties */
    opacity: ${props => props.show ? 1 : 0};
    transform: ${props => props.show 
        ? 'translateY(-50%)' 
        : `translateY(-50%) translateX(${props.isExtended ? '-10px' : '10px'})`};
    visibility: ${props => props.show ? 'visible' : 'hidden'};
    transition: all 0.3s ease-in-out;
    transform-origin: ${props => props.isExtended ? 'left' : 'right'};
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

const ModelItem = styled.div`
    padding: 10px;
    margin: 5px 0;
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

    input[type="radio"] {
        cursor: pointer;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        accent-color: #3498db;
    }
`;

const ModelListContent = styled.div`
    overflow-y: auto;
    flex-grow: 1;
    display: grid;
    grid-template-columns: ${props => props.isExtended ? 'repeat(auto-fill, minmax(250px, 1fr))' : '1fr'};
    gap: 10px;
    padding-right: 10px;
    
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
    margin-left: ${props => props.isExtended ? '320px' : '320px'};
    background-color: rgba(44, 62, 80, 0.7);
    backdrop-filter: blur(8px);
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: ${props => (props.show && !props.isExtended) ? 1 : 0};
    transform: translateX(${props => (props.show && !props.isExtended) ? '0' : '-20px'});
    transition: all 0.3s ease;
    visibility: ${props => (props.show && !props.isExtended) ? 'visible' : 'hidden'};
    pointer-events: ${props => (props.show && !props.isExtended) ? 'auto' : 'none'};
    z-index: 1;
`;

const ModelContent = styled.div`
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

const StyledModal = styled(Modal)`
    display: flex;
    align-items: center;
    justify-content: center;
`;

const ModalContent = styled.div`
    position: relative;
    background-color: #ffffff;
    padding: 20px;
    border-radius: 8px;
    width: 80vw;
    max-width: 1400px;
    max-height: 95vh;
    overflow-y: auto;
    margin: 20px auto;
    
    /* Animation */
    animation: modalPop 0.3s ease-out;
    
    @keyframes modalPop {
        0% {
            opacity: 0;
            transform: scale(0.7);
        }
        100% {
            opacity: 1;
            transform: scale(1);
        }
    }
`;

const CloseButton = styled.button`
    position: absolute;
    right: 10px;
    top: 10px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
    
    &:hover {
        color: #000;
    }
`;

const ChartContainer = styled.div`
    background: white;
    padding: 16px;
    border-radius: 8px;
    margin: 20px auto;
    max-width: 90%;
    width: 100%;
    height: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    /* Ensure chart takes full width */
    canvas {
        width: 100% !important;
        height: 100% !important;
    }
`;

const ChartControl = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
        font-size: 12px;
        color: #666;
    }

    select, input {
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
        width: 120px;
    }

    input[type="number"] {
        width: 80px;
    }
`;

const TabContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 20px;
    width: 100%;
`;

const Tab = styled.button`
    flex: 1;
    padding: 8px 16px;
    background: ${props => props.active ? '#3498db' : '#f5f5f5'};
    color: ${props => props.active ? 'white' : '#333'};
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.active ? '#3498db' : '#e0e0e0'};
    }
`;

const ExtendButton = styled.button`
    position: absolute;
    right: 0px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(44, 62, 80, 0);
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    padding: 8px 4px;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: background-color 0.2s;

    &:hover {
        background: rgba(44, 62, 80, 0.9);
    }

    /* Arrow icon */
    &::before {
        content: ${props => props.isExtended ? '"◀"' : '"▶"'};
        display: block;
        font-size: 12px;
    }
`;

const ConfigHeader = styled.div`
    display: flex;
    gap: 15px;
    align-items: center;
    padding: 15px 15px 0;
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
        background: rgba(255, 255, 255, 0.1);
    }
`;

const impsyModes = ["callresponse", "polyphony", "battle", "useronly"];

// Helper to extract current mode from configContent
function getCurrentMode(configContent) {
    const match = configContent.match(/mode\s*=\s*"(callresponse|polyphony|battle|useronly)"/);
    return match ? match[1] : "callresponse";
}

const RightSide = () => {
    const navigate = useNavigate();
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDimension, setSelectedDimension] = useState(null);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        dimension: 'all',
        timeRange: 'all',
        fileType: '.keras',
        customStartDate: '',
        customEndDate: '',
        customDimension: ''
    });
    const [chartSettings, setChartSettings] = useState({
        smoothing: 0.6,
        xAxis: 'step',
        yScaleType: 'linear',
        ignoreOutliers: true
    });
    const [activeTab, setActiveTab] = useState('train');
    const [trainMetrics, setTrainMetrics] = useState(null);
    const [validationMetrics, setValidationMetrics] = useState(null);
    const [isExtended, setIsExtended] = useState(false);
    const selectedModelRef = useRef(null);
    const chartRef = useRef(null);
    const [configContent, setConfigContent] = useState('');
    const [projectName, setProjectName] = useState('');
    const [mode, setMode] = useState("callresponse");

    useEffect(() => {
        const fetchModels = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get('/api/models');
                setModels(response.data || []);
            } catch (error) {
                console.error('Error fetching models:', error);
                setError('Failed to fetch models');
                setModels([]);
            } finally {
                setLoading(false);
            }
        };

        fetchModels();
    }, []);

    useEffect(() => {
        if (!modalOpen) {
            setTrainMetrics(null);
            setValidationMetrics(null);
        }
    }, [modalOpen]);

    useEffect(() => {
        if (chartRef.current && (trainMetrics || validationMetrics)) {
            const currentMetrics = activeTab === 'train' ? trainMetrics : validationMetrics;
            const chartData = formatMetricsData(currentMetrics?.epoch_loss || []);
            
            if (chartData && chartData.datasets) {
                chartRef.current.data = chartData;
                chartRef.current.update('none');
            }
        }
    }, [trainMetrics, validationMetrics, activeTab, chartSettings.smoothing]);

    useEffect(() => {
        if (selectedModel) {
            // Generate default project name from timestamp and model
            const timestamp = new Date().toISOString().slice(0,19).replace(/[-:]/g, '').replace('T', '-');
            const modelBaseName = selectedModel.replace(/\.(keras|h5|tflite)$/, '');
            const newProjectName = `${timestamp}-${modelBaseName}`;
            
            // Update project name
            setProjectName(newProjectName);
            
            // Fetch and update config
            fetchConfig();
        }
    }, [selectedModel]);

    useEffect(() => {
        if (configContent) {
            setMode(getCurrentMode(configContent));
        }
    }, [configContent]);

    const handleModelClick = async (model) => {
        try {
            setModalOpen(true);
            
            // Get TensorBoard metrics for both train and validation
            const trainResponse = await axios.get(`/api/models/${model}/tensorboard/train`);
            if (trainResponse.data.success) {
                setTrainMetrics(trainResponse.data.metrics);
                console.log("Train metrics:", trainResponse.data.metrics);
            }

            const validationResponse = await axios.get(`/api/models/${model}/tensorboard/validation`);
            if (validationResponse.data.success) {
                setValidationMetrics(validationResponse.data.metrics);
                console.log("Validation metrics:", validationResponse.data.metrics);
            }
        } catch (error) {
            console.error('Error fetching model details:', error);
            alert('Failed to fetch model details');
        }
    };

    const handleCheckboxChange = (model) => {
        const dimensionMatch = model.match(/(\d+)d-mdrnn/);
        const modelDimension = dimensionMatch ? dimensionMatch[1] : null;

        if (selectedModel === model) {
            setSelectedModel(null);
            setSelectedDimension(null);
        } else {
            setSelectedModel(model);
            setSelectedDimension(modelDimension);
            setIsExtended(false);
            
            // Wait for the extension to close before scrolling
            setTimeout(() => {
                selectedModelRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300); // Match the transition duration
        }
    };

    const handleLoad = async () => {
        if (!selectedModel) {
            alert('Please select a model first');
            return;
        }

        if (!projectName.trim()) {
            alert('Please enter a project name');
            return;
        }

        try {
            setLoading(true);
            
            // Update config content with project name before saving
            let updatedConfigContent = configContent.replace(
                /project_name = ".*"/,
                `project_name = "${projectName}"`
            );
            
            // Save config file to project folder with updated project name
            await axios.post('/api/new-project', {
                projectName: projectName,
                configContent: updatedConfigContent
            });

            // Load the model with the selected model file
            await axios.post('/api/load-model', {
                projectName: projectName,
                modelFile: selectedModel  // Pass the selected model file to the backend
            });
            
            // Navigate to project page with project name in URL
            navigate(`/project/${projectName}`, { 
                state: { 
                    transition: 'fade',
                    from: 'home' 
                }
            });
            
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project: ' + error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const parseModelDate = (filename) => {
        const match = filename.match(/^(\d{8})-(\d{2}_\d{2}_\d{2})/);
        if (match) {
            const [_, date, time] = match;
            const formattedTime = time.replace(/_/g, ':');
            const formattedDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
            return new Date(`${formattedDate}T${formattedTime}`);
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

    const filteredModels = models.filter(file => {
        let pass = true;
        
        // Filter by dimension
        if (filters.dimension !== 'all') {
            const dimensionMatch = file.match(/dim(\d+)/);
            const fileDimension = dimensionMatch ? dimensionMatch[1] : null;
            if (filters.dimension === 'custom') {
                pass = pass && fileDimension === filters.customDimension;
            } else {
                pass = pass && fileDimension === filters.dimension;
            }
        }

        // Filter by time range
        if (filters.timeRange !== 'all') {
            const fileDate = parseModelDate(file);
            pass = pass && isWithinTimeRange(fileDate, filters.timeRange);
        }

        // Filter by file type
        if (filters.fileType !== 'all') {
            if (filters.fileType === 'checkpoint') {
                pass = pass && file.includes('-ckpt');
            } else {
                pass = pass && file.endsWith(filters.fileType) && !file.includes('-ckpt');
            }
        }

        return pass;
    });

    const smoothData = (data, factor) => {
        if (!data || data.length === 0) return [];
        let smoothed = [];
        let lastValue = data[0].value;
        
        for (let point of data) {
            const currentValue = point.value;
            const smoothedValue = lastValue * factor + currentValue * (1 - factor);
            smoothed.push({
                ...point,
                value: smoothedValue
            });
            lastValue = smoothedValue;
        }
        
        return smoothed;
    };

    const formatMetricsData = (metricsData) => {
        if (!metricsData || metricsData.length === 0) return null;

        const values = Array.isArray(metricsData) ? metricsData : [];
        
        return {
            datasets: [
                {
                    label: 'Raw',
                    data: values.map(v => ({
                        x: v.step,
                        y: v.value
                    })),
                    borderColor: 'rgba(200, 200, 200, 1)',
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 1,
                    order: 2
                },
                {
                    label: 'Smoothed',
                    data: smoothData(values, chartSettings.smoothing).map(v => ({
                        x: v.step,
                        y: v.value
                    })),
                    borderColor: 'rgba(255, 0, 0, 0.8)',
                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: 2,
                    order: 1
                }
            ]
        };
    };

    // Helper function to get current metrics based on active tab
    const getCurrentMetrics = () => {
        if (activeTab === 'train') {
            return trainMetrics?.epoch_loss || [];
        } else {
            // For validation tab, return the epoch_loss by default
            return validationMetrics?.epoch_loss || [];
        }
    };

    // Update the ExtendButton click handler to also close the filter menu
    const handleExtendClick = () => {
        setIsExtended(!isExtended);
        setShowFilters(false); // Close filter menu when extending/collapsing
    };

    const fetchConfig = async () => {
        try {
            const response = await axios.get('/api/config');
            const updatedContent = response.data.config_content
                // Update model file path
                .replace(
                    /file = "models\/.*"/,
                    `file = "models/${selectedModel}"`
                )
                // Clear log files list
                .replace(
                    /\[log\][\s\S]*?file = \[([\s\S]*?)\]/,
                    '[log]\nfile = []'
                )
                // Update project name
                .replace(
                    /project_name = ".*"/,
                    `project_name = ""`
                );
            setConfigContent(updatedContent);
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    const handleImportModels = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }

        try {
            const response = await axios.post('/api/import-models', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.imported_files.length > 0) {
                alert(`Successfully imported ${response.data.imported_files.length} model files`);
                // Refresh the models list
                const modelsResponse = await axios.get('/api/models');
                setModels(modelsResponse.data || []);
            }

            if (response.data.errors.length > 0) {
                alert('Errors occurred:\n' + response.data.errors.join('\n'));
            }
        } catch (error) {
            alert('Failed to import model files: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDeleteModel = async (model, event) => {
        event.stopPropagation(); // Prevent model selection when clicking delete
        
        if (window.confirm(`Are you sure you want to delete ${model}?`)) {
            try {
                const response = await axios.delete(`/api/models/${model}`);
                if (response.data.success) {
                    // If the deleted model was selected, clear the selection
                    if (selectedModel === model) {
                        setSelectedModel(null);
                        setSelectedDimension(null);
                        setConfigContent('');
                    }
                    
                    // Refresh the models list
                    const modelsResponse = await axios.get('/api/models');
                    setModels(modelsResponse.data || []);
                    
                    // Show success message
                    alert(`Model ${model} deleted successfully`);
                } else {
                    alert(`Error: ${response.data.error}`);
                }
            } catch (error) {
                console.error('Failed to delete model file:', error);
                alert(`Failed to delete model file: ${error.response?.data?.error || error.message}`);
            }
        }
    };

    const handleModeChange = (event) => {
        const newMode = event.target.value;
        setMode(newMode);
        // Replace mode in configContent
        setConfigContent(prev => prev.replace(/mode\s*=\s*"(callresponse|polyphony|battle|useronly)"/, `mode = "${newMode}"`));
    };

    return (
        <Container>
            <ModelList isExtended={isExtended}>
                <TitleContainer>
                    <StyledTypography variant="h6">
                        Select Model
                    </StyledTypography>
                    
                    <FilterButton 
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </FilterButton>
                </TitleContainer>

                
                <FilterMenu show={showFilters} isExtended={isExtended}>
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
                        <label>File Type</label>
                        <select 
                            value={filters.fileType}
                            onChange={(e) => handleFilterChange('fileType', e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value=".keras">Keras</option>
                            <option value=".h5">H5</option>
                            <option value=".tflite">TFLite</option>
                            <option value="checkpoint">Checkpoints</option>
                        </select>
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

                <ModelListContent isExtended={isExtended}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Audio height="80" width="80" color="white" ariaLabel="loading" />
                        </div>
                    ) : error ? (
                        <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                            {error}
                        </div>
                    ) : filteredModels.length > 0 ? (
                        filteredModels.map((model, index) => {
                            const dimensionMatch = model.match(/dim(\d+)/);
                            const modelDimension = dimensionMatch ? dimensionMatch[1] : null;
                            const isDisabled = selectedDimension !== null && modelDimension !== selectedDimension;
                            
                            return (
                                <ModelItem 
                                    key={index} 
                                    ref={selectedModel === model ? selectedModelRef : null}
                                    onClick={() => handleModelClick(model)}
                                    style={{ 
                                        cursor: 'pointer',
                                        opacity: isDisabled ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        checked={selectedModel === model}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleCheckboxChange(model);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={isDisabled}
                                        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                    />
                                    <span style={{ flex: 1 }}>{model}</span>
                                    <DeleteButton 
                                        onClick={(e) => handleDeleteModel(model, e)}
                                        title="Delete model file"
                                    >
                                        ×
                                    </DeleteButton>
                                </ModelItem>
                            );
                        })
                    ) : (
                        <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                            No models found.
                        </div>
                    )}
                </ModelListContent>
                <ButtonContainer>
                    <input
                        type="file"
                        id="model-file-input"
                        multiple
                        accept=".h5,.tflite,.keras"
                        style={{ display: 'none' }}
                        onChange={handleImportModels}
                    />
                    <Button 
                        onClick={() => document.getElementById('model-file-input').click()}
                        variant="contained"
                        size="small"
                        fullWidth
                    >
                        Import
                    </Button>
                    <Button 
                        onClick={handleLoad}
                        variant="contained"
                        size="small"
                        fullWidth
                        disabled={!selectedModel}
                    >
                        Load Model
                    </Button>
                </ButtonContainer>

                <ExtendButton 
                    onClick={handleExtendClick}
                    isExtended={isExtended}
                />
            </ModelList>

            <MainContent 
                show={selectedModel !== null} 
                isExtended={isExtended}
            >
                <ModelContent>
                    <ConfigHeader>
                        <TextField
                            fullWidth
                            label="Project Name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            margin="normal"
                            variant="outlined"
                            size="small"
                            sx={{
                                width: '300px',
                                '& .MuiInputBase-input': {
                                    color: 'white',
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                },
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.23)',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                    },
                                },
                            }}
                        />
                        {/* IMPSY Mode Dropdown at top right of config panel */}
                        <div style={{ marginLeft: 'auto', marginTop: 0 }}>
                            <FormControl size="small" variant="outlined" sx={{ minWidth: 180, background: 'rgba(44,62,80,0.8)', borderRadius: 1 }}>
                                <InputLabel sx={{ color: 'white' }}>IMPSY Mode</InputLabel>
                                <Select
                                    label="IMPSY Mode"
                                    value={mode}
                                    onChange={handleModeChange}
                                    sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}
                                >
                                    {impsyModes.map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>
                    </ConfigHeader>
                    <Box sx={{
                        flex: 1,
                        padding: '0 15px 15px',
                        overflow: 'hidden'
                    }}>
                        <ConfigTextArea
                            value={configContent}
                            onChange={(e) => setConfigContent(e.target.value)}
                        />
                    </Box>
                </ModelContent>
            </MainContent>

            <StyledModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                BackdropProps={{
                    timeout: 300
                }}
                style={{
                    backdropFilter: 'blur(5px)'
                }}
            >
                <ModalContent>
                    <CloseButton onClick={() => setModalOpen(false)}>×</CloseButton>
                    <Typography variant="h6" gutterBottom>
                        {selectedModel}
                    </Typography>
                    
                    <TabContainer>
                        <Tab 
                            active={activeTab === 'train'} 
                            onClick={() => setActiveTab('train')}
                        >
                            Train
                        </Tab>
                        <Tab 
                            active={activeTab === 'validation'} 
                            onClick={() => setActiveTab('validation')}
                        >
                            Validation
                        </Tab>
                    </TabContainer>

                    {(activeTab === 'train' ? trainMetrics : validationMetrics) && (
                        <ChartContainer>
                            <ChartControl>
                                <label>Smoothing</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="0.99"
                                    step="0.01"
                                    value={chartSettings.smoothing}
                                    onChange={(e) => setChartSettings(prev => ({
                                        ...prev,
                                        smoothing: parseFloat(e.target.value)
                                    }))}
                                />
                            </ChartControl>
                            <div style={{ height: 'calc(100% - 60px)' }}>
                                <Line
                                    ref={chartRef}
                                    data={formatMetricsData(getCurrentMetrics())}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        animation: {
                                            duration: 0
                                        },
                                        scales: {
                                            x: {
                                                type: 'linear',
                                                display: true,
                                                title: {
                                                    display: true,
                                                    text: chartSettings.xAxis.charAt(0).toUpperCase() + chartSettings.xAxis.slice(1)
                                                },
                                                grid: {
                                                    display: true,
                                                    color: '#e0e0e0'
                                                }
                                            },
                                            y: {
                                                type: chartSettings.yScaleType,
                                                display: true,
                                                title: {
                                                    display: true,
                                                    text: 'Value'
                                                },
                                                grid: {
                                                    display: true,
                                                    color: '#e0e0e0'
                                                }
                                            }
                                        },
                                        layout: {
                                            padding: {
                                                left: 10,
                                                right: 30,
                                                top: 20,
                                                bottom: 10
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </ChartContainer>
                    )}
                </ModalContent>
            </StyledModal>
        </Container>
    );
};

export default RightSide;