import { MCPBasePayload } from '../dto/mcp.dto';

export interface MCPProcessor {
  process(payload: MCPBasePayload): Promise<any>;
}

export interface OpenAiCredentials {
  apiUrl: string,
  secretKey: string
}