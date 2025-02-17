import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Typography, Box, LinearProgress } from '@mui/material';
import axios from 'axios';

const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(44, 62, 80, 0.95);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    padding: 20px;
`;

const LogWindow = styled.div`
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    padding: 20px;
    margin: 20px;
    flex-grow: 1;
    overflow-y: auto;
    font-family: monospace;
    color: white;
    white-space: pre-wrap;
    
    &::-webkit-scrollbar {
        display: none;
    }
`;

const TrainingMetrics = styled.div`
    display: flex;
    gap: 20px;
    margin: 20px;
`;

const MetricBox = styled.div`
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 4px;
    min-width: 150px;
`;

const TrainingVisualizer = ({ onClose }) => {
    const [trainingLog, setTrainingLog] = useState([]);
    const [currentEpoch, setCurrentEpoch] = useState(0);
    const [totalEpochs, setTotalEpochs] = useState(100);
    const [loss, setLoss] = useState(null);
    const [valLoss, setValLoss] = useState(null);

    useEffect(() => {
        console.log("Setting up EventSource");
        const eventSource = new EventSource('/api/training/stream');
        
        eventSource.onmessage = (event) => {
            console.log("Received message:", event.data);
            const data = JSON.parse(event.data);
            setTrainingLog(prev => [...prev, data.message]);
            
            if (data.metrics) {
                setCurrentEpoch(data.metrics.epoch);
                setLoss(data.metrics.loss);
                setValLoss(data.metrics.val_loss);
            }
        };

        eventSource.onerror = (error) => {
            console.error("EventSource error:", error);
        };

        // Add status checking
        const checkStatus = setInterval(async () => {
            try {
                const response = await axios.get('/api/training/status');
                console.log("Training status:", response.data);
                if (!response.data.is_running) {
                    clearInterval(checkStatus);
                    eventSource.close();
                }
            } catch (error) {
                console.error("Error checking training status:", error);
            }
        }, 5000);

        return () => {
            console.log("Cleaning up EventSource");
            eventSource.close();
            clearInterval(checkStatus);
        };
    }, []);

    return (
        <Container>
            <Typography variant="h5" style={{ color: 'white', margin: '20px' }}>
                Training Progress
            </Typography>
            
            <TrainingMetrics>
                <MetricBox>
                    <Typography variant="body2" style={{ color: 'white' }}>
                        Progress
                    </Typography>
                    <Typography variant="h6" style={{ color: 'white' }}>
                        {currentEpoch} / {totalEpochs}
                    </Typography>
                    <LinearProgress 
                        variant="determinate" 
                        value={(currentEpoch/totalEpochs) * 100}
                        sx={{ marginTop: 1 }}
                    />
                </MetricBox>
                
                <MetricBox>
                    <Typography variant="body2" style={{ color: 'white' }}>
                        Loss
                    </Typography>
                    <Typography variant="h6" style={{ color: 'white' }}>
                        {loss?.toFixed(4) || '-'}
                    </Typography>
                </MetricBox>
                
                <MetricBox>
                    <Typography variant="body2" style={{ color: 'white' }}>
                        Validation Loss
                    </Typography>
                    <Typography variant="h6" style={{ color: 'white' }}>
                        {valLoss?.toFixed(4) || '-'}
                    </Typography>
                </MetricBox>
            </TrainingMetrics>

            <LogWindow>
                {trainingLog.join('\n')}
            </LogWindow>
        </Container>
    );
};

export default TrainingVisualizer; 