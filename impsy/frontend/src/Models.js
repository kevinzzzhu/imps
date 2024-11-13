import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Audio } from 'react-loader-spinner'; 

function Models() {
    const [models, setModels] = useState([]);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/models');
            setModels(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching models', error);
            setLoading(false);
        }
    };

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!file) {
            alert('No file selected');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setLoading(true);

        try {
            const response = await axios.post('/api/models', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            fetchModels();  // Refresh the list after uploading
            alert('Upload successful');
            setLoading(false);
        } catch (error) {
            console.error('Error uploading file', error);
            alert('Upload failed');
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>IMPSY Model Files</h1>
            <a href="/" className="back-link">Back to IMPSY</a>

            <h2>Upload New Model</h2>
            <form onSubmit={handleUpload}>
                <input type="file" onChange={handleFileChange} />
                <input type="submit" value="Upload" />
            </form>

            <h2>Existing Models</h2>
            {loading ? (
                <Audio height="80" width="80" color="green" ariaLabel="loading" />
            ) : models.length ? (
                <ul>
                    {models.map((model, index) => (
                        <li key={index}>
                            {model}
                            <a href={`/download_model/${model}`}>[Download]</a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No model files found.</p>
            )}
        </div>
    );
}

export default Models;
