import { IsDefined, IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { ProcessType } from "../enum/process.enum";

export class MCPBasePayload {
  @IsEnum(ProcessType)
  processType: ProcessType;

  @IsString()
  userId: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class MCPRequestDto {
  @IsEnum(["gpt-3", "gpt-4", "gpt-4.1", "gpt-5"])
  model: string;

  @IsDefined()
  input: string | Record<string, unknown>;

  @IsOptional()
  userId?: string;

  @IsOptional()
  processType?: ProcessType;
}

/**
 * e.g -
 {
  "processType": "CHAT",
  "userId": "123",
  "payload": {
    "message": "Should I follow up with Amazon?"
  },
  "meta": {
    "source": "prompt-box"
  }
}
 */