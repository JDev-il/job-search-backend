import { HttpService } from "@nestjs/axios";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { EmailIntent, RuleField } from "../emails/enums/email.enum";
import { IntentSignalRule, NormalizedEmail } from "../emails/interfaces/email.interface";
import { MCPBasePayload, MCPRequestDto } from "../mcp/dto/mcp.dto";
import { ProcessType } from "../mcp/enum/process.enum";

@Injectable()
export class HelperService {
  constructor(private httpService: HttpService) { }

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

  public textCleaner(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Scoring helpers
  public getFieldText(email: NormalizedEmail, field: RuleField): string {
    switch (field) {
      case RuleField.SUBJECT:
        return email.subject;
      case RuleField.BODY:
        return email.bodyText;
      case RuleField.BODY_CLEANED:
        return email.bodyCleaned ?? '';
      default:
        return '';
    }
  }

  public getEmailScores(): IntentSignalRule {
    return {
      [EmailIntent.CONFIRMATION]: 0,
      [EmailIntent.REJECTION]: 0,
      [EmailIntent.INTERVIEW]: 0,
      [EmailIntent.ASSESSMENT]: 0,
      [EmailIntent.FOLLOW_UP]: 0,
      [EmailIntent.UNKNOWN]: 0,
    }
  }
}