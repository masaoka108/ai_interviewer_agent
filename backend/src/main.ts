import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  const port = process.env.PORT || 8000;
  const wsPort = process.env.WS_PORT || 3001;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  logger.log('Initializing server with config:', {
    port,
    wsPort,
    frontendUrl,
    nodeEnv: process.env.NODE_ENV
  });

  // WebSocketアダプターを設定
  const wsAdapter = new WsAdapter(app);
  app.useWebSocketAdapter(wsAdapter);
  logger.log('WebSocket adapter configured');

  // CORSを設定
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'WS', 'WSS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  await app.listen(port);
  logger.log(`HTTP server is running on: http://localhost:${port}`);
  logger.log(`WebSocket server is listening on: ws://0.0.0.0:${wsPort}`);
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 