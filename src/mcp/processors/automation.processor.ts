import { Injectable } from '@nestjs/common';
import { MCPBasePayload } from '../dto/mcp.dto';
import { MCPProcessor } from '../interfaces/mcp-processor.interface';

@Injectable()
export class AutomationProcessor implements MCPProcessor {
  async process(payload: MCPBasePayload): Promise<any> {
    const { payload: data } = payload;

    // Simulate automation
    return {
      automationType: data.action,
      status: 'executed',
      data,
    };
  }
}