const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { Server: OSCServer, Client: OSCClient } = require('node-osc');

// Express setup
const app = express();
app.use(cors());

// Create WebSocket server for frontend
const wss = new WebSocket.Server({ port: 8080 });

// Create OSC servers to receive messages
const backendServer = new OSCServer(5002, '0.0.0.0');  // Receives from backend
const deviceServer = new OSCServer(5004, '0.0.0.0');   // Receives from device

// Create OSC clients to forward messages
const deviceClient = new OSCClient('127.0.0.1', 5003); // Forwards to device
const backendClient = new OSCClient('127.0.0.1', 5000); // Forwards to backend

// Store connected WebSocket clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Frontend client connected to WebSocket');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Frontend client disconnected from WebSocket');
        clients.delete(ws);
    });
});

// Handle messages from backend (Port 5002)
backendServer.on('message', (msg) => {
    try {
        // console.log('Message received from backend:', msg);
        const address = msg[0];
        const values = msg.slice(1);
        
        // Forward to device on port 5003
        deviceClient.send(address, ...values, () => {
            // console.log('Forwarded to device on port 5003');
        });

        // Send to frontend via WebSocket
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'output',
                    data: values
                }));
            }
        });
    } catch (error) {
        // console.error('Error processing backend message:', error);
    }
});

// Handle messages from device (Port 5004)
deviceServer.on('message', (msg) => {
    try {
        // console.log('Message received from device:', msg);
        const address = msg[0];
        const values = msg.slice(1);
        
        // Forward to backend on port 5000
        backendClient.send(address, ...values, () => {
            // console.log('Forwarded to backend on port 5000');
        });

        // Send to frontend via WebSocket
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'input',
                    data: values
                }));
            }
        });
    } catch (error) {
        console.error('Error processing device message:', error);
    }
});

// Start HTTP server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    // console.log('\nServer Configuration:');
    // console.log(`- HTTP server running on port ${PORT}`);
    // console.log('- WebSocket server on port 8080');
    // console.log('\nOSC Configuration:');
    // console.log('- Receiving from backend on port 5002');
    // console.log('- Receiving from device on port 5004');
    // console.log('- Forwarding to device on port 5003');
    // console.log('- Forwarding to backend on port 5000');
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down servers...');
    backendServer.close();
    deviceServer.close();
    deviceClient.close();
    backendClient.close();
    wss.close();
    process.exit();
});