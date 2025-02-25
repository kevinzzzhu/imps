import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Audio } from 'react-loader-spinner';

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
    transform: translateX(100%);
    animation: slideIn 0.5s ease-out forwards;

    &.exit-left {
        animation: slideOutLeft 0.5s ease-in forwards;
    }

    &.exit-right {
        animation: slideOutRight 0.5s ease-in forwards;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutLeft {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-100%);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;

const LoaderContainer = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
`;

const LoaderText = styled.div`
    color: white;
    font-size: 1.2rem;
    text-align: center;
`;

const LogWindow = styled.div`
    position: relative;
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

const TrainingVisualizer = ({ exitDirection = 'right' }) => {
    const [trainingLog, setTrainingLog] = useState([]);
    const [isExiting, setIsExiting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        const eventSource = new EventSource('/api/training/stream');
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setTrainingLog(prev => [...prev, data.message]);
        };

        eventSource.onerror = (error) => {
            if (eventSource.readyState !== 2) {
                console.error("EventSource error:", error);
            }
        };

        const checkStatus = setInterval(async () => {
            try {
                const response = await axios.get('/api/training/status');
                console.log("Training status:", response.data);
                if (!response.data.is_running) {
                    setIsCompleted(true);
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
        <Container className={isExiting ? `exit-${exitDirection}` : ''}>
            <LogWindow>
                {trainingLog.join('\n')}
                {!isCompleted && (
                    <LoaderContainer>
                        <Audio 
                            height={80}
                            width={80}
                            color="white"
                            ariaLabel="training-loading"
                        />
                        <LoaderText>Training in progress...</LoaderText>
                    </LoaderContainer>
                )}
            </LogWindow>
        </Container>
    );
};

export default TrainingVisualizer; 