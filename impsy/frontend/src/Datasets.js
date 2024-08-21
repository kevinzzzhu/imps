import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Audio } from 'react-loader-spinner';  // Ensure this component is imported correctly

function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newDataset, setNewDataset] = useState('');
  const [dimension, setDimension] = useState(2); // default dimension
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/datasets');
      setDatasets(response.data.datasets || []);
      setMessages(response.data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching datasets', error);
      setDatasets([]);
      setMessages(['Failed to fetch datasets']);
      setLoading(false);
    }
  };

  const handleGenerateDataset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/api/datasets', { dimension: dimension }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setNewDataset(response.data.newDataset);
      setMessages(response.data.messages || []);
      fetchDatasets(); // Refresh the list
    } catch (error) {
      console.error('Error generating dataset', error);
      alert('Generate failed');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>IMPSY Dataset Files</h1>
      {messages.map((message, index) => (
        <p key={index}>{message}</p>
      ))}

      <a href="/" className="back-link">Back to IMPSY</a>

      <form onSubmit={handleGenerateDataset}>
        <label htmlFor="dimension">Dataset Dimension:</label>
        <input type="number" id="dimension" value={dimension} onChange={(e) => setDimension(e.target.value)} required min="2" />
        <button type="submit">Generate Dataset</button>
      </form>

      {loading ? (
        <Audio height="80" width="80" color="green" ariaLabel="loading" />
      ) : datasets.length ? (
        <ul>
          {datasets.map((file) => (
            <li key={file} className={file === newDataset ? "highlight" : ""}>
              {file}
              <a href={`/download_dataset/${file}`}>[Download]{file === newDataset && <i> updated!</i>}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No dataset files found.</p>
      )}
    </div>
  );
}

export default Datasets;
