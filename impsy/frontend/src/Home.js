import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import LeftSide from './components/home/LeftSide';
import RightSide from './components/home/RightSide';
import ipadEnsemble from './assets/images/ipad-ensemble.jpg';
import metatoneHands from './assets/images/metatone-hands-header.jpg';
import TrainingVisualizer from './components/home/TrainingVisualizer';

const GlobalStyle = styled.div`
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: fixed;
    top: 0;
    left: 0;
`;

const Container = styled.div`
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    margin: 0;
    padding: 0;
    position: absolute;
    top: 0;
    left: 0;
`;

const Half = styled.div`
    flex: ${props => props.isSelected ? 0.99 : props.isOtherSelected ? 0 : 0.5};
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative;
    transition: all 0.5s ease-in-out;
    overflow: hidden;
    
    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: ${props => props.background};
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }
    
    &:hover:before {
        opacity: 0.9;
    }
    
    ${props => props.isOtherSelected && `
        width: 0;
        flex: 0.01;
    `}
`;

const LeftHalf = styled(Half)`
    background-image: url(${metatoneHands});
    background-size: cover;
    background-position: center;
    &:before {
        background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
        opacity: 0.7;
    }
`;

const RightHalf = styled(Half)`
    background-image: url(${ipadEnsemble});
    background-size: cover;
    background-position: center;
    &:before {
        background: linear-gradient(135deg, #403A3E 0%, #BE5869 100%);
        opacity: 0.7;
    }
`;

const Text = styled.h2`
    color: white;
    font-size: 2.5rem;
    text-align: center;
    position: relative;
    z-index: 1;
    transition: transform 0.3s ease, opacity 0.3s ease;
    padding: 0 2rem;
    
    ${props => (props.isOtherSelected || props.showComponent) && `
        opacity: 0;
        transform: scale(0);
    `}
    
    &:hover {
        transform: scale(1.1);
    }
`;

const SubText = styled.p`
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.2rem;
    text-align: center;
    position: relative;
    z-index: 1;
    max-width: 80%;
    margin-top: 1rem;
    opacity: ${props => props.isVisible && !props.showComponent ? 1 : 0};
    transform: translateY(${props => props.isVisible && !props.showComponent ? 0 : '20px'});
    transition: all 0.3s ease;
`;

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: ${props => props.isSelected ? 1 : props.isOtherSelected ? 0 : 1};
    transform: scale(${props => props.isSelected ? 1 : props.isOtherSelected ? 0 : 1});
    transition: all 0.5s ease-in-out;
`;

const ComponentWrapper = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: ${props => props.isVisible ? 1 : 0};
    transform: scale(${props => props.isVisible ? 1 : 0.95});
    transition: all 0.5s ease-in-out;
    visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
    background-color: transparent;
`;

const ReturnButton = styled.button`
    position: fixed;
    top: 50%;
    ${props => props.side === 'left' ? 'right: 0' : 'left: 0'};
    transform: translateY(-50%);
    padding: 18px 8px;
    background: ${props => props.side === 'left' 
        ? 'linear-gradient(135deg, #403A3E 0%, #BE5869 100%)'
        : 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)'
    };
    border: none;
    border-radius: ${props => props.side === 'left' ? '4px 0 0 4px' : '0 4px 4px 0'};
    color: white;
    cursor: pointer;
    z-index: 1000;
    transition: all 0.5s ease;
    opacity: ${props => props.show ? 1 : 0};
    pointer-events: ${props => props.show ? 'auto' : 'none'};
    font-size: 1rem;
    box-shadow: ${props => props.side === 'left' 
        ? '-2px 0 10px rgba(0, 0, 0, 0.2)' 
        : '2px 0 10px rgba(0, 0, 0, 0.2)'
    };

    &:hover {
        transform: translateY(-50%) ${props => props.side === 'left' 
            ? 'translateX(-2px)' 
            : 'translateX(2px)'
        };
    }
`;

const NavigationButton = styled.button`
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    padding: 18px 8px;
    background: ${props => props.side === 'left' 
        ? 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)'
        : 'linear-gradient(135deg, #403A3E 0%, #BE5869 100%)'
    };
    border: none;
    border-radius: ${props => props.side === 'left' ? '0 4px 4px 0' : '4px 0 0 4px'};
    color: white;
    cursor: pointer;
    z-index: 1001;
    ${props => props.side === 'left' ? 'left: 0;' : 'right: 0;'}
    font-size: 1rem;
    box-shadow: ${props => props.side === 'left' 
        ? '2px 0 10px rgba(0, 0, 0, 0.2)' 
        : '-2px 0 10px rgba(0, 0, 0, 0.2)'
    };
    
    opacity: 0;
    transform: translateY(-50%) translateX(${props => props.side === 'left' ? '-100%' : '100%'});
    animation: ${props => props.show ? 'slideButton 0.5s ease-out forwards' : 'none'};
    animation-delay: 0.2s;
    pointer-events: ${props => props.show ? 'auto' : 'none'};
    transition: all 0.5s ease;

    @keyframes slideButton {
        from {
            opacity: 0;
            transform: translateY(-50%) translateX(${props => props.side === 'left' ? '-100%' : '100%'});
        }
        to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
        }
    }

    &:hover {
        transform: translateY(-50%) ${props => props.side === 'left' 
            ? 'translateX(4px)' 
            : 'translateX(-4px)'
        };
        box-shadow: ${props => props.side === 'left'
            ? '4px 0 15px rgba(0, 0, 0, 0.3)'
            : '-4px 0 15px rgba(0, 0, 0, 0.3)'
        };
    }
`;

const Banner = styled.div`
    position: fixed;
    top: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(44,62,80,0.95);
    color: white;
    padding: 14px 32px;
    border-radius: 8px;
    font-size: 1rem;
    z-index: 2000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
`;

const BannerLink = styled.a`
    color: #4FC3F7;
    text-decoration: underline;
    cursor: pointer;
    font-weight: bold;
    &:hover { color: #81D4FA; }
`;

function Home() {
    const [selectedSide, setSelectedSide] = useState(null);
    const [isHoveredLeft, setIsHoveredLeft] = useState(false);
    const [isHoveredRight, setIsHoveredRight] = useState(false);
    const [showComponent, setShowComponent] = useState(false);
    const [showTrainingVisualizer, setShowTrainingVisualizer] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.reset) {
            setSelectedSide(null);
            setIsHoveredLeft(false);
            setIsHoveredRight(false);
            setShowComponent(false);
            setShowTrainingVisualizer(false);
        }
    }, [location.state?.reset]);

    const handleSideClick = (side) => {
        setSelectedSide(side);
        // Delay showing the component until the side expansion animation is mostly complete
        setTimeout(() => {
            setShowComponent(true);
        }, 400);
    };

    const handleReturn = () => {
        setSelectedSide(null);
        setShowComponent(false);
        setIsHoveredLeft(false);
        setIsHoveredRight(false);
        setShowTrainingVisualizer(false);
    };

    // Add this effect to reset the side selection when training visualizer shows
    useEffect(() => {
        if (showTrainingVisualizer) {
            setSelectedSide(null);
            setShowComponent(false);
            setIsHoveredLeft(false);
            setIsHoveredRight(false);
        }
    }, [showTrainingVisualizer]);

    const handleLeft = () => {
        setShowTrainingVisualizer(false);
        setSelectedSide('left');
        // Delay showing the component until the side expansion animation is mostly complete
        setTimeout(() => {
            setShowComponent(true);
        }, 400);
    };

    const handleRight = () => {
        setShowTrainingVisualizer(false);
        setSelectedSide('right');
        // Delay showing the component until the side expansion animation is mostly complete
        setTimeout(() => {
            setShowComponent(true);
        }, 400);
    };

    // Handler for the banner link
    const handleUserOnlyClick = async (e) => {
        e.preventDefault();
        // Generate a project name
        const timestamp = new Date().toISOString().slice(0,19).replace(/[-:]/g, '').replace('T', '-');
        const projectName = `${timestamp}-useronly`;
        // Fetch current config, set mode to useronly, and create project
        try {
            const response = await fetch('/api/config');
            let config = await response.json();
            let configContent = config.config_content;
            // Replace project_name
            configContent = configContent.replace(/project_name\s*=\s*".*"/, `project_name = "${projectName}"`);
            // Replace mode in config
            configContent = configContent.replace(/mode\s*=\s*"(callresponse|polyphony|battle|useronly)"/, 'mode = "useronly"');
            // Set model file to empty string
            configContent = configContent.replace(/file\s*=\s*"models\/.*"/, 'file = ""');
            // Clear log file list
            configContent = configContent.replace(/\[log\][\s\S]*?file\s*=\s*\[[^\]]*\]/, '[log]\nfile = []');
            // Save config and create project
            await fetch('/api/new-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName, configContent })
            });
            // Navigate to project page
            navigate(`/project/${projectName}`);
        } catch (err) {
            alert('Failed to create user-only project: ' + err.message);
        }
    };

    return (
        <GlobalStyle>
            {/* Banner for first time users */}
            {selectedSide === null && !showTrainingVisualizer && (
                <Banner>
                    First time?{' '}
                    <BannerLink href="#" onClick={handleUserOnlyClick}>
                        Try user-only to generate your first model!
                    </BannerLink>
                </Banner>
            )}
            <ReturnButton 
                show={selectedSide !== null}
                onClick={handleReturn}
                side={selectedSide}
            >
                {selectedSide === 'left' ? '❮' : '❯'}
            </ReturnButton>

            <NavigationButton 
                show={showTrainingVisualizer}
                onClick={handleLeft}
                side="left"
            >
                ❮
            </NavigationButton>
            <NavigationButton 
                show={showTrainingVisualizer}
                onClick={handleRight}
                side="right"
            >
                ❯
            </NavigationButton>
            
            <Container>
                <LeftHalf 
                    onClick={() => !showTrainingVisualizer && handleSideClick('left')}
                    onMouseEnter={() => !showTrainingVisualizer && setIsHoveredLeft(true)}
                    onMouseLeave={() => setIsHoveredLeft(false)}
                    isSelected={selectedSide === 'left'}
                    isOtherSelected={selectedSide === 'right'}
                >
                    <ContentWrapper 
                        isSelected={selectedSide === 'left'}
                        isOtherSelected={selectedSide === 'right'}
                    >
                        <Text 
                            isOtherSelected={selectedSide === 'right'} 
                            showComponent={showComponent || showTrainingVisualizer}
                        >
                            Step 1: Start a Project
                        </Text>
                        <SubText 
                            isVisible={isHoveredLeft || selectedSide === 'left'}
                            showComponent={showComponent || showTrainingVisualizer}
                        >
                            Create a brand new model with your previous practice!
                        </SubText>
                    </ContentWrapper>
                </LeftHalf>
                
                <RightHalf 
                    onClick={() => !showTrainingVisualizer && handleSideClick('right')}
                    onMouseEnter={() => !showTrainingVisualizer && setIsHoveredRight(true)}
                    onMouseLeave={() => setIsHoveredRight(false)}
                    isSelected={selectedSide === 'right'}
                    isOtherSelected={selectedSide === 'left'}
                >
                    <ContentWrapper 
                        isSelected={selectedSide === 'right'}
                        isOtherSelected={selectedSide === 'left'}
                    >
                        <Text 
                            isOtherSelected={selectedSide === 'left'}
                            showComponent={showComponent || showTrainingVisualizer}
                        >
                            Step 2: Select Existing Model
                        </Text>
                        <SubText 
                            isVisible={isHoveredRight || selectedSide === 'right'}
                            showComponent={showComponent || showTrainingVisualizer}
                        >
                            Continue with a previously trained model!
                        </SubText>
                    </ContentWrapper>
                </RightHalf>

                <ComponentWrapper isVisible={showComponent && !showTrainingVisualizer}>
                    {selectedSide === 'left' && (
                        <LeftSide 
                            onTrainingStart={() => setShowTrainingVisualizer(true)}
                        />
                    )}
                    {selectedSide === 'right' && <RightSide />}
                </ComponentWrapper>

                {showTrainingVisualizer && (
                    <TrainingVisualizer 
                        onClose={() => setShowTrainingVisualizer(false)}
                        exitDirection={selectedSide === 'left' ? 'right' : 'left'}
                    />
                )}
            </Container>
        </GlobalStyle>
    );
}

export default Home;