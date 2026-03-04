import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { MCPBasePayload, MCPRequestDto } from "../mcp/dto/mcp.dto";
import { ProcessType } from "../mcp/enum/process.enum";

@Injectable()
export class HelperService {

  tokenExtractor(req: Request): string {
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('Missing authorization header');

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7); // remove "Bearer "
    }
    return authHeader;
  }

  public toMcpPayload(payload: MCPRequestDto) {
    return {
      processType: payload.processType ?? ProcessType.CHAT,
      userId: payload.userId ?? 'guest',
      payload: {
        message:
          typeof payload.input === 'string'
            ? payload.input
            : JSON.stringify(payload.input),
      },
      meta: {
        model: payload.model,
      },
    } as MCPBasePayload;
  }
}