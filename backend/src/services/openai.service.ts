import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from './prisma.service';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateInterviewResponse(
    text: string,
    questionId: number,
    interviewId: string,
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "あなたは面接官です。面接の質問に対する回答を評価し、適切なフィードバックを提供してください。"
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || '申し訳ありません。応答を生成できませんでした。';

      // 応答をデータベースに保存
      await this.prisma.aiResponse.create({
        data: {
          content: response,
          questionId: questionId,
          interviewId: interviewId,
        },
      });

      return response;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('AI応答の生成に失敗しました');
    }
  }
} 