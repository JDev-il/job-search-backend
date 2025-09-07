import { MCPBasePayload } from '../dto/mcp.dto';

export interface MCPProcessor {
  process(payload: MCPBasePayload): Promise<any>;
}