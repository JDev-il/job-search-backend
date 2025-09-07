import { Body, Controller, Post } from '@nestjs/common';
import { HelperService } from '../services/helper.service';
import { MCPRequestDto } from './dto/mcp.dto';
import { MCPService } from './mcp.service';

@Controller('mcp')
export class MCPController {
  constructor(private readonly mcpService: MCPService, private helper: HelperService) { }
  @Post('process')
  async handleMCPRequest(@Body() body: MCPRequestDto): Promise<any> {
    const mcpPayload = this.helper.toMcpPayload(body);
    const result = await this.mcpService.handle(mcpPayload);
    return { success: true, result };
  }
}