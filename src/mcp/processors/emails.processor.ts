import { Injectable } from '@nestjs/common';
import { MCPBasePayload } from '../dto/mcp.dto';
import { MCPProcessor } from '../interfaces/mcp-processor.interface';

@Injectable()
export class EmailClassificationProcessor implements MCPProcessor {
  async process(payload: MCPBasePayload): Promise<any> {
    const { payload: data } = payload;
    const userMessage = payload.payload.message;
    const prompt = data.message;
    const aiResponse = await this.fakeGPTCall(prompt);
    return {
      prompt,
      response: aiResponse,
    };
  }

  private async fakeGPTCall(message: string): Promise<string> {
    return `Response to: "${message}"`;
  }
}