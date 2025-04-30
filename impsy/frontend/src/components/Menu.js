import React, { useRef } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as PlusIcon } from '../assets/icons/plus.svg';
import { ReactComponent as OpenIcon } from '../assets/icons/open.svg';
import { ReactComponent as RecentIcon } from '../assets/icons/recent.svg';
import { ReactComponent as InfoIcon } from '../assets/icons/info.svg';
import { ReactComponent as FaqIcon } from '../assets/icons/faq.svg';
import { ReactComponent as FeedbackIcon } from '../assets/icons/feedback.svg';

const MenuContainer = styled.div`
    height: 100vh;
    width: 150px;
    background-color: rgba(107, 129, 152, 0.8);
    position: fixed;
    top: 0;
    left: 0;
    transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform 0.3s ease-in-out;
    z-index: 1200;
    padding: 0px 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
`;

const MenuItem = styled.div`
    width: 70%;
    padding: ${props => props.padding || '12px'};
    margin: ${props => props.margin || '8px 0'};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background-color: ${props => props.primary ? 'rgba(52, 152, 219, 0.7)' : 'rgba(255, 255, 255, 0.1)'};
    color: #333;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s ease;

    &:hover {
        background-color: ${props => props.hoverColor || 'rgba(133, 125, 222, 0.7)'};
    }

    svg {
        width: 16px;
        height: 16px;
        margin-bottom: 3px;
        fill: currentColor;
        border-radius: 50%;
        padding: 10px;
        background-color: #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
`;

export const TogglableMenu = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const handleNavigation = (path) => {
        if (path === '/') {
            navigate('/', { 
                replace: true, 
                state: { 
                    reset: Date.now() 
                } 
            });
            window.location.reload();
        } else {
            navigate(path);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const configContent = e.target.result;
                    const projectName = file.name.replace('.toml', '');

                    // Create new project with the config file
                    const response = await fetch('/api/new-project', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            projectName,
                            configContent,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to create project');
                    }

                    // Load the project
                    const loadResponse = await fetch('/api/load-model', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            projectName,
                        }),
                    });

                    if (!loadResponse.ok) {
                        throw new Error('Failed to load project');
                    }

                    navigate('/project/' + projectName, { 
                        replace: true, 
                        state: { 
                            reset: Date.now(),
                            projectLoaded: true,
                            projectName 
                        } 
                    });
                } catch (error) {
                    console.error('Error handling project:', error);
                }
            };
            reader.readAsText(file);
        }
    };

    const handleOpenProjectClick = () => {
        fileInputRef.current.click();
    };

    return (
        <MenuContainer isOpen={isOpen} onMouseLeave={onClose}>
            <MenuItem 
                bgColor="#FFD9E4" 
                hoverColor="rgba(179, 80, 80, 0.7)" 
                padding="28px 12px" 
                margin="30px 0" 
                onClick={() => handleNavigation('/')}
            >
                <PlusIcon />
                <span>New Project</span>
            </MenuItem>
            <MenuItem onClick={handleOpenProjectClick}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                <OpenIcon />
                <span>Open Project</span>
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/recent')}>
                <RecentIcon />
                <span>Recent Projects</span>
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/about')}>
                <InfoIcon />
                <span>About IMPSY</span>
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/faq')}>
                <FaqIcon />
                <span>FAQ</span>
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/feedback')}>
                <FeedbackIcon />
                <span>Send Feedback</span>
            </MenuItem>
        </MenuContainer>
    );
};

export default TogglableMenu;
