import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MCPController } from './mcp.controller';
import { MCPService } from './mcp.service';

import { HelperService } from '../services/helper.service';
import { OpenAIService } from './openai/openai.service';
import { AutomationProcessor } from './processors/automation.processor';
import { TestProcessor } from './processors/tests.processor';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [MCPController],
  providers: [
    MCPService,
    HelperService,
    // TODO: switch TestProcessoer with ChatProcessor when OpenAI API is ready
    TestProcessor,
    AutomationProcessor,
    OpenAIService,
  ],
  exports: [MCPService],
})
export class MCPModule { }