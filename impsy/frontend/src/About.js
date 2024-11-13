import styled from 'styled-components';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from "react-router-dom";
import { CircularProgress, Typography, List, ListItem, ListItemText, Link as MuiLink, Box } from '@mui/material';

// TODO: Make it scrollable and automatically gets "stuck" and "attracted" to each section

const AboutContainer = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: #333;
    font-size: 16px;
    text-align: center;
`;

function About() {
    const [routes, setRoutes] = useState([]);
    const [hardwareInfo, setHardwareInfo] = useState({});
    const [softwareInfo, setSoftwareInfo] = useState({});
    const [loadingHardware, setLoadingHardware] = useState(true);
    const [loadingSoftware, setLoadingSoftware] = useState(true);

    useEffect(() => {
        fetchRoutes();
        fetchHardwareInfo();
        fetchSoftwareInfo();
    }, []);

    const fetchRoutes = async () => {
        const response = await axios.get('/api/routes');
        setRoutes(response.data);
    };

    const fetchHardwareInfo = async () => {
        const response = await axios.get('/api/hardware-info');
        setHardwareInfo(response.data);
        setLoadingHardware(false);
    };

    const fetchSoftwareInfo = async () => {
        const response = await axios.get('/api/software-info');
        setSoftwareInfo(response.data);
        setLoadingSoftware(false);
    };

    return (
        <><AboutContainer>
            <h1>About IMPSY</h1>
            <p>
                Rather than predicting symbolic music (e.g., MIDI notes), we suggest that predicting future control data from the user and precise temporal information can lead to new and interesting interactive possibilities. We propose that a mixture density recurrent neural network (MDRNN) is an appropriate model for this task. The predictions can be used to fill-in control data when the user stops performing, or as a kind of filter on the user's own input.
            </p>
            <p>
                We present an interactive MDRNN prediction server that allows rapid prototyping of new NIMEs featuring predictive musical interaction by recording datasets, training MDRNN models, and experimenting with interaction modes. We illustrate our system with several example NIMEs applying this idea. Our evaluation shows that real-time predictive interaction is viable even on single-board computers and that small models are appropriate for small datasets.
            </p>
        </AboutContainer>
        <Box sx={{ p: 2 }}>
                <Typography variant="h6">All Pages:</Typography>
                <List>
                    <ListItem><Link to="/">Home</Link></ListItem>
                    <ListItem><Link to="/logs">Logs</Link></ListItem>
                    <ListItem><Link to="/datasets">Datasets</Link></ListItem>
                    <ListItem><Link to="/models">Models</Link></ListItem>
                    <ListItem><Link to="/config">Edit Config</Link></ListItem>
                    <ListItem><Link to="/faq">FAQ</Link></ListItem>
                    <ListItem><Link to="/feedback">Feedback Form</Link></ListItem>
                    <ListItem><Link to="/about">About IMPSY</Link></ListItem>
                    <ListItem><Link to="/recent">Recent Projects</Link></ListItem>
                </List>

                <Typography variant="h6">System Information:</Typography>
                {loadingHardware ? (
                    <CircularProgress />
                ) : (
                    <List>
                        {Object.entries(hardwareInfo).map(([key, value]) => (
                            <ListItem key={key}><ListItemText primary={key} secondary={value} /></ListItem>
                        ))}
                    </List>
                )}

                <Typography variant="h6">Project Information:</Typography>
                {loadingSoftware ? (
                    <CircularProgress />
                ) : (
                    <List>
                        {Object.entries(softwareInfo).map(([key, value]) => (
                            <ListItem key={key}>
                                <ListItemText
                                    primary={key}
                                    secondary={typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ?
                                        <MuiLink href={value} target="_blank">{value}</MuiLink> : value} />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box></>
    );
}

export default About;
