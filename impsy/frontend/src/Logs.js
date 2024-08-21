import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Audio } from 'react-loader-spinner';  // Ensure you have this component imported
import './styles/styles.css';

function Logs() {
    const [logFiles, setLogFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogFiles();
    }, []);

    const fetchLogFiles = async () => {
        try {
            const response = await axios.get('/api/logs');
            setLogFiles(response.data);
            setLoading(false);  // Set loading to false after fetching data
        } catch (error) {
            console.error('Failed to fetch log files:', error);
            setLoading(false);  // Ensure loading is set to false even if there is an error
        }
    };

    return (
        <div>
            <h1>IMPSY Log Files</h1>
            <a href="/" className="back-link">Back to IMPSY</a>

            {loading ? (
                <Audio height="80" width="80" color="green" ariaLabel="loading" />
            ) : logFiles.length > 0 ? (
                <ul>
                    {logFiles.map((file, index) => (
                        <li key={index}>
                            {file}
                            <a href={`/download_log/${file}`}>[Download]</a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No log files found.</p>
            )}
        </div>
    );
}

export default Logs;
