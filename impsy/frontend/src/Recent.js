import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// TODO: Handle project detail

const RecentContainer = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
`;

const ProjectItem = styled.div`
    background-color: #ffffff;
    padding: 20px;
    margin: 10px 0;
    width: 100%;
    max-width: 600px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: background-color 0.3s ease;

    &:hover {
        background-color: #eef3f9;
    }
`;

function RecentProjects() {
    const navigate = useNavigate();
    const projects = [
        { title: 'Project Alpha', detail: 'Details about Project Alpha.' },
        { title: 'Project Beta', detail: 'Details about Project Beta.' },
        { title: 'Project Gamma', detail: 'Details about Project Gamma.' }
    ];

    const handleProjectClick = (project) => {
        // navigate('/', { state: { project } });
    };

    return (
        <RecentContainer>
            <h1>Recent Projects</h1>
            {projects.map((project, index) => (
                <ProjectItem key={index} onClick={() => handleProjectClick(project)}>
                    <h2>{project.title}</h2>
                    <p>{project.detail}</p>
                </ProjectItem>
            ))}
        </RecentContainer>
    );
}

export default RecentProjects;
