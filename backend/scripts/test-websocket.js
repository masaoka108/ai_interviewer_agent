const WebSocket = require('ws');

console.log('Starting WebSocket test...');

function connectWithRetry(retries = 5) {
  console.log(`Attempting to connect (${retries} retries left)...`);
  
  const ws = new WebSocket('ws://backend:3001/ws/interview?interviewId=test', {
    headers: {
      'Origin': 'http://localhost:3000'
    }
  });

  ws.on('open', () => {
    console.log('Connected to WebSocket server');
    // テストメッセージを送信
    ws.send(JSON.stringify({
      type: 'connection_test',
      data: { timestamp: Date.now() }
    }));
  });

  ws.on('message', (data) => {
    console.log('Received:', data.toString());
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', {
      message: error.message,
      code: error.code,
      address: error.address,
      port: error.port
    });

    if (retries > 0) {
      console.log('Retrying connection in 5 seconds...');
      setTimeout(() => connectWithRetry(retries - 1), 5000);
    } else {
      console.log('Max retries reached. Exiting...');
      process.exit(1);
    }
  });

  ws.on('close', (code, reason) => {
    console.log('Connection closed:', { 
      code, 
      reason: reason.toString() 
    });
  });
}

// バックエンドの起動を待つ
console.log('Waiting for backend to start...');
setTimeout(() => {
  console.log('Starting connection attempt...');
  connectWithRetry();
}, 30000);  // 30秒待機に変更

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
}); 