const express = require('express');
const cors = require('cors');
const { Server: OSCServer } = require('node-osc');
const WebSocket = require('ws');

const app = express();
app.use(cors());

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Create OSC servers
const inputServer = new OSCServer(5000, '0.0.0.0');
const outputServer = new OSCServer(5002, '0.0.0.0');

// Store connected WebSocket clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
        clients.delete(ws);
    });
});

// Handle OSC input messages
inputServer.on('message', (msg) => {
    try {
        const values = msg.slice(1).map(Number);
        // Broadcast to all connected clients
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'input', data: values }));
            }
        });
        console.log('Input data received:', values);
    } catch (error) {
        console.error('Error processing input OSC message:', error);
    }
});

// Handle OSC output messages
outputServer.on('message', (msg) => {
    try {
        const values = msg.slice(1).map(Number);
        // Broadcast to all connected clients
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'output', data: values }));
            }
        });
        console.log('Output data received:', values);
    } catch (error) {
        console.error('Error processing output OSC message:', error);
    }
});

// Start HTTP server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
    console.log('WebSocket server running on port 8080');
    console.log('OSC Input server listening on port 5000');
    console.log('OSC Output server listening on port 5002');
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    inputServer.close();
    outputServer.close();
    wss.close();
    process.exit();
});