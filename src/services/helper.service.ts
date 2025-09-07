import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { MCPBasePayload, MCPRequestDto } from "../mcp/dto/mcp.dto";
import { ProcessType } from "../mcp/enum/process.enum";

@Injectable()
export class HelperService {

  public tokenExtractor(req: Request): string {
    return req.headers.authorization.split(' ')[1];
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