import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { Typography, CircularProgress, Grid2, Container } from '@mui/material';

const RecentContainer = styled.div`
    padding: 40px 20px;
    width: 100vw;
    height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const HeaderContainer = styled.div`
    margin-bottom: 20px;
    text-align: center;
`;

const ProjectItem = styled.div`
    background-color: #ffffff;
    padding: 24px;
    height: 100%;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;

    &:hover {
        background-color: #f8faff;
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
`;

const ProjectTitle = styled(Typography)`
    font-weight: 600;
    color: #2c3e50;
    font-size: 1.25rem;
`;

const ProjectMeta = styled(Typography)`
    color: #7f8c8d;
    font-size: 0.9rem;
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid #eee;
`;

const ProjectDescription = styled(Typography)`
    color: #34495e;
    margin-top: 8px;
    font-size: 1rem;
    line-height: 1.5;
    flex-grow: 1;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 400px;
`;

const NoProjectsContainer = styled.div`
    text-align: center;
    padding: 40px;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const ScrollableContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 20px 40px;
    height: calc(100vh - 200px);
`;

function RecentProjects() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/projects');
            setProjects(response.data);
            console.log(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleProjectClick = (project) => {
        navigate(`/project/${project.name}`);
    };

    if (loading) {
        return (
            <RecentContainer>
                <LoadingContainer>
                    <CircularProgress />
                </LoadingContainer>
            </RecentContainer>
        );
    }

    if (error) {
        return (
            <RecentContainer>
                <Container maxWidth="lg">
                    <Typography color="error" align="center">{error}</Typography>
                </Container>
            </RecentContainer>
        );
    }

    return (
        <RecentContainer>
            <Container maxWidth="xl">
                <HeaderContainer>
                    <Typography variant="h5" gutterBottom>
                        Recent Projects
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        Browse and manage your IMPSY projects
                    </Typography>
                </HeaderContainer>

                <ScrollableContent>
                    {projects.length === 0 ? (
                        <NoProjectsContainer>
                            <Typography variant="h6">No projects found</Typography>
                            <Typography color="textSecondary" sx={{ mt: 1 }}>
                                Create a new project to get started
                            </Typography>
                        </NoProjectsContainer>
                    ) : (
                        <Grid2 container spacing={8}>
                            {projects.map((project, index) => (
                                <Grid2 item xs={12} sm={6} lg={4} xl={3} key={index}>
                                    <ProjectItem onClick={() => handleProjectClick(project)}>
                                        <ProjectTitle variant="h6">
                                            {project.name}
                                        </ProjectTitle>
                                        <ProjectDescription>
                                            {project.title}
                                            <br />
                                            {project.description}
                                        </ProjectDescription>
                                        <ProjectMeta>
                                            {project.owner} • {
                                                new Date(project.last_modified * 1000).toLocaleString()
                                            }
                                        </ProjectMeta>
                                    </ProjectItem>
                                </Grid2>
                            ))}
                        </Grid2>
                    )}
                </ScrollableContent>
            </Container>
        </RecentContainer>
    );
}

export default RecentProjects;
