import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Typography } from '@mui/material';
import axios from 'axios';

const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(44, 62, 80, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    padding: 60px;
    opacity: 0;
    animation: fadeIn 0.5s ease-out forwards;
    animation-delay: 0.3s;

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
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
    opacity: 0;
    transform: translateX(20px);
    animation: slideIn 0.5s ease-out forwards;
    animation-delay: 0.6s; // Start after container fades in
    
    &::-webkit-scrollbar {
        display: none;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;

const Title = styled(Typography)`
    color: white;
    margin: 20px;
    opacity: 0;
    animation: fadeIn 0.5s ease-out forwards;
    animation-delay: 0.8s; // Start after log window slides in

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

const TrainingVisualizer = () => {
    const [trainingLog, setTrainingLog] = useState([]);

    useEffect(() => {
        const eventSource = new EventSource('/api/training/stream');
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setTrainingLog(prev => [...prev, data.message]);
        };

        eventSource.onerror = (error) => {
            // Only log error if it's not due to a normal connection close
            if (eventSource.readyState !== 2) { // 2 = CLOSED
                console.error("EventSource error:", error);
            }
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
            eventSource.close();
            clearInterval(checkStatus);
        };
    }, []);

    return (
        <Container>
            <Title variant="h5">
                Training Progress
            </Title>

            <LogWindow>
                {trainingLog.join('\n')}
            </LogWindow>
        </Container>
    );
};

export default TrainingVisualizer; 