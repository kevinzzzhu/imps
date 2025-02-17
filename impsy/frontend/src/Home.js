import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';
import LeftSide from './components/home/LeftSide';
import RightSide from './components/home/RightSide';
import ipadEnsemble from './assets/images/ipad-ensemble.jpg';
import metatoneHands from './assets/images/metatone-hands-header.jpg';

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

function Home() {
    const [selectedSide, setSelectedSide] = useState(null);
    const [isHoveredLeft, setIsHoveredLeft] = useState(false);
    const [isHoveredRight, setIsHoveredRight] = useState(false);
    const [showComponent, setShowComponent] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.reset) {
            setSelectedSide(null);
            setIsHoveredLeft(false);
            setIsHoveredRight(false);
            setShowComponent(false);
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
    };

    return (
        <GlobalStyle>
            <ReturnButton 
                show={selectedSide !== null}
                onClick={handleReturn}
                side={selectedSide}
            >
                {selectedSide === 'left' ? '❮' : '❯'}
            </ReturnButton>
            <Container>
                <LeftHalf 
                    onClick={() => handleSideClick('left')}
                    onMouseEnter={() => setIsHoveredLeft(true)}
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
                            showComponent={showComponent}
                        >
                            Start a Project
                        </Text>
                        <SubText 
                            isVisible={isHoveredLeft || selectedSide === 'left'}
                            showComponent={showComponent}
                        >
                            Create a brand new model with your previous practice!
                        </SubText>
                    </ContentWrapper>
                </LeftHalf>
                
                <RightHalf 
                    onClick={() => handleSideClick('right')}
                    onMouseEnter={() => setIsHoveredRight(true)}
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
                            showComponent={showComponent}
                        >
                            Select Existing Model
                        </Text>
                        <SubText 
                            isVisible={isHoveredRight || selectedSide === 'right'}
                            showComponent={showComponent}
                        >
                            Continue with a previously trained model!
                        </SubText>
                    </ContentWrapper>
                </RightHalf>

                <ComponentWrapper isVisible={showComponent}>
                    {selectedSide === 'left' && <LeftSide />}
                    {selectedSide === 'right' && <RightSide />}
                </ComponentWrapper>
            </Container>
        </GlobalStyle>
    );
}

export default Home;