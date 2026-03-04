import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { KeyGuard } from '../auth/guards/keyguard.guard';
import { HelperService } from '../services/helper.service';
import { MCPRequestDto } from './dto/mcp.dto';
import { MCPService } from './mcp.service';


@Controller('mcp')
@UseGuards(KeyGuard) // both guards applied
export class MCPController {
  constructor(private readonly mcpService: MCPService, private helper: HelperService) { }

  @Post('request')
  async handleMCPRequest(@Body() body: MCPRequestDto, @Req() req: Request): Promise<any> {
    const mcpPayload = this.helper.toMcpPayload(body);
    // const result = await this.mcpService.handleMcpRequest(mcpPayload);
    // return { success: true, result };
  }
}