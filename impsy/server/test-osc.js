const { Client } = require('node-osc');

// Create OSC clients for testing
const backendClient = new Client('127.0.0.1', 5002);  // Simulates backend
const deviceClient = new Client('127.0.0.1', 5004);   // Simulates device

// Test backend path
setInterval(() => {
    const backendData = Array(3).fill(0).map(() => Math.random());
    backendClient.send('/interface', backendData[0], backendData[1], backendData[2], () => {
        console.log('Backend test: Sent to 5002:', backendData);
    });
}, 2000);

// Test device path
setInterval(() => {
    const deviceData = Array(3).fill(0).map(() => Math.random());
    deviceClient.send('/impsy', deviceData[0], deviceData[1], deviceData[2], () => {
        console.log('Device test: Sent to 5004:', deviceData);
    });
}, 3000);