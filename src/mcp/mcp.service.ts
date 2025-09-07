import { Injectable } from '@nestjs/common';
import { MCPBasePayload } from './dto/mcp.dto';
import { ProcessType } from './enum/process.enum';
import { MCPProcessor } from './interfaces/mcp-processor.interface';
import { AutomationProcessor } from './processors/automation.processor';
import { TestProcessor } from './processors/tests.processor';

@Injectable()
export class MCPService {
  private processors: Record<ProcessType, MCPProcessor>;
  constructor(
    private readonly chatProcessor: TestProcessor,
    private readonly automationProcessor: AutomationProcessor,
  ) {
    this.processors = {
      [ProcessType.CHAT]: this.chatProcessor,
      [ProcessType.AUTOMATION]: this.automationProcessor,
      [ProcessType.SYSTEM_TRIGGER]: this.automationProcessor
    };
  }
  async handle(payload: MCPBasePayload): Promise<any> {
    const processor = this.processors[payload.processType];
    if (!processor) {
      throw new Error(`Unsupported process type: ${payload.processType}`);
    }
    return processor.process(payload);
  }
}