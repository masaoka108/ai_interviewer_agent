import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OpenAIService } from '../services/openai.service';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

interface AudioData {
  text: string;
  questionId: number;
  timestamp: number;
  language: string;
}

interface RealtimeMessage {
  type: 'audio_data' | 'interim_data';
  data: AudioData;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  path: '/ws/interview',
  transports: ['websocket'],
  namespace: '/ws',
  port: process.env.WS_PORT || 3001,
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private sessions: Map<string, Socket> = new Map();
  private readonly logger = new Logger(InterviewGateway.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly prisma: PrismaService
  ) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.debug('New connection attempt', {
      clientId: client.id,
      query: client.handshake.query,
    });

    try {
      const interviewId = client.handshake.query.interviewId as string;
      if (!interviewId) {
        this.logger.warn('Connection rejected: No interviewId provided');
        client.disconnect();
        return;
      }

      await this.validateConnection(interviewId);
      this.sessions.set(interviewId, client);
      
      this.logger.log('Connection established', {
        clientId: client.id,
        interviewId,
      });

      // 接続確認メッセージを送信
      client.emit('connection_established', {
        status: 'connected',
        timestamp: Date.now(),
      });

    } catch (error) {
      this.logger.error('Connection failed', error);
      client.disconnect();
    }
  }

  private async validateConnection(interviewId: string): Promise<void> {
    // 面接セッションの存在確認などのバリデーション
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new Error('Invalid interview session');
    }
  }

  handleDisconnect(client: Socket) {
    try {
      console.log('\n=== WebSocket Disconnection ===');
      const interviewId = client.handshake.query.interviewId as string;
      if (interviewId) {
        this.sessions.delete(interviewId);
        console.log('Client disconnected:', {
          clientId: client.id,
          interviewId,
          remainingConnections: this.sessions.size
        });
      }
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  }

  @SubscribeMessage('audio_data')
  async handleAudioData(client: Socket, message: RealtimeMessage) {
    console.log('\n=== Received Audio Data ===');
    console.log('Message:', message);
    
    try {
      const response = await this.openAIService.generateInterviewResponse(
        message.data.text,
        message.data.questionId,
        client.handshake.query.interviewId as string
      );

      console.log('AI Response:', response);

      client.emit('message', {
        type: 'ai_response',
        data: {
          text: response,
          timestamp: Date.now(),
          questionId: message.data.questionId
        }
      });
    } catch (error) {
      console.error('Error processing audio data:', error);
      client.emit('error', {
        type: 'error',
        message: 'AIの応答生成に失敗しました',
        details: error.message
      });
    }
  }

  // 中間結果のハンドラ（オプション）
  @SubscribeMessage('interim_data')
  async handleInterimData(client: Socket, message: RealtimeMessage) {
    // 中間結果の処理（必要に応じて）
    console.log('Interim data received:', message);
  }

  @SubscribeMessage('connection_test')
  handleConnectionTest(client: Socket, data: any) {
    console.log('Connection test received:', {
      clientId: client.id,
      data
    });
    
    client.emit('message', {
      type: 'connection_test_response',
      data: {
        received: data,
        timestamp: Date.now()
      }
    });
  }
} 