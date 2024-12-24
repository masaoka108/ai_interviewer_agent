import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InterviewGateway } from './websocket/interview.gateway';
import { OpenAIService } from './services/openai.service';
import { PrismaService } from './services/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [
    InterviewGateway,
    OpenAIService,
    PrismaService,
  ],
})
export class AppModule {} 