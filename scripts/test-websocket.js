const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/ws/interview?interviewId=test');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log('Connection closed:', { code, reason });
}); 