import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Typography, List, ListItem, Box, Modal, Paper, Button, Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material';
import { Audio } from 'react-loader-spinner';

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

const TitleContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
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

    button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
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

const StyledModal = styled(Modal)`
    display: flex;
    align-items: center;
    justify-content: center;
`;

const ModalContent = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80vw;
    max-height: 90vh;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    overflow-y: auto;
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

const RightSide = () => {
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modelContent, setModelContent] = useState('');
    const [selectedDimension, setSelectedDimension] = useState(null);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        dimension: 'all',
        timeRange: 'all',
        fileType: 'all',
        customStartDate: '',
        customEndDate: '',
        customDimension: ''
    });
    const [tensorboardUrl, setTensorboardUrl] = useState(null);

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

    const handleModelClick = async (model) => {
        try {
            setSelectedModel(model);
            setModalOpen(true);
            
            // Get TensorBoard URL
            const tbResponse = await axios.get(`/api/models/${model}/tensorboard`);
            if (tbResponse.data.success) {
                setTensorboardUrl(tbResponse.data.tensorboard_url);
            }
            
            const response = await axios.get(`/api/models/${model}`);
            setModelContent(response.data.content);
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
        }
    };

    const handleLoad = async () => {
        if (!selectedModel) {
            alert('Please select a model first');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post('/api/load-model', {
                model: selectedModel
            });
            alert('Model loaded successfully!');
        } catch (error) {
            console.error('Error loading model:', error);
            alert('Failed to load model: ' + error.response?.data?.error || error.message);
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

    return (
        <Container>
            <ModelList>
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

                <ModelListContent>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Audio height="80" width="80" color="white" ariaLabel="loading" />
                        </div>
                    ) : error ? (
                        <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                            {error}
                        </div>
                    ) : filteredModels.length > 0 ? (
                        <List>
                            {filteredModels.map((model, index) => {
                                const dimensionMatch = model.match(/dim(\d+)/);
                                const modelDimension = dimensionMatch ? dimensionMatch[1] : null;
                                const isDisabled = selectedDimension !== null && modelDimension !== selectedDimension;
                                
                                return (
                                    <ModelItem 
                                        key={index} 
                                        onClick={() => handleModelClick(model)}
                                        style={{ 
                                            cursor: 'pointer',
                                            opacity: isDisabled ? 0.5 : 1 
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
                                        {model}
                                    </ModelItem>
                                );
                            })}
                        </List>
                    ) : (
                        <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                            No models found.
                        </div>
                    )}
                </ModelListContent>
                <ButtonContainer>
                    <Button 
                        onClick={handleLoad}
                        variant="contained"
                        size="small"
                        sx={{
                            cursor: !selectedModel ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Load Model
                    </Button>
                </ButtonContainer>
            </ModelList>

            <StyledModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            >
                <ModalContent>
                    <CloseButton onClick={() => setModalOpen(false)}>×</CloseButton>
                    <Typography variant="h6" gutterBottom>
                        {selectedModel}
                    </Typography>
                    
                    {tensorboardUrl && (
                        <Box sx={{ mb: 2, height: '60vh' }}>
                            <iframe
                                src={tensorboardUrl}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '4px',
                                }}
                                title="TensorBoard"
                            />
                        </Box>
                    )}

                    <Box sx={{ 
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        backgroundColor: '#f5f5f5',
                        padding: '15px',
                        borderRadius: '4px',
                        maxHeight: '30vh',
                        overflow: 'auto'
                    }}>
                        {modelContent}
                    </Box>
                </ModalContent>
            </StyledModal>
        </Container>
    );
};

export default RightSide;