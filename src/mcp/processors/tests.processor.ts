import { Injectable } from '@nestjs/common';
import { MCPBasePayload } from '../dto/mcp.dto';
import { MCPProcessor } from '../interfaces/mcp-processor.interface';

@Injectable()
export class TestProcessor implements MCPProcessor {
  async process(payload: MCPBasePayload): Promise<any> {
    const { payload: data } = payload;
    const userMessage = payload.payload.message;

    // TODO: Add RAG or DB context enrichment here if needed
    const prompt = data.message;

    // Call OpenAI or mock
    const aiResponse = await this.fakeGPTCall(prompt);
    return {
      prompt,
      response: aiResponse,
    };
  }

  private async fakeGPTCall(message: string): Promise<string> {
    return `🤖 Response to: "${message}"`;
  }
}