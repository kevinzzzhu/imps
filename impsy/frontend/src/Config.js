import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Audio } from 'react-loader-spinner';

function Config() {
    const [configContent, setConfigContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/config');
            setConfigContent(response.data.config_content);
            setMessage('');
        } catch (error) {
            setMessage('Failed to fetch configuration');
            console.error('Error fetching config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!window.confirm('Are you sure you want to save these changes?')) {
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post('/api/config', { config_content: configContent });
            setMessage('Configuration saved successfully!');
        } catch (error) {
            setMessage('Error saving configuration');
            console.error('Error posting config:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Edit IMPSY Configuration</h1>
            <a href="/" className="back-link">Back to IMPSY</a>
            <h2>Existing Config</h2>
            <p>You can edit this directly here or save somewhere else.</p>
            <form onSubmit={handleSave}>
                <textarea 
                    value={configContent} 
                    onChange={(e) => setConfigContent(e.target.value)}
                    rows={10}
                    style={{ width: '100%' }}
                ></textarea>
                <br />
                <button type="submit">Save Configuration</button>
            </form>
            {loading ? <Audio height="50" width="50" color="green" ariaLabel="loading" /> : <p>{message}</p>}
        </div>
    );
}

export default Config;
