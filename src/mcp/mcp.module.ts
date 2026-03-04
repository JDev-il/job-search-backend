import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { MCPController } from './mcp.controller';
import { MCPService } from './mcp.service';

import { KeyGuard } from '../auth/guards/keyguard.guard';
import { HelperService } from '../services/helper.service';
import { OpenAIService } from './openai/openai.service';
import { AutomationProcessor } from './processors/automation.processor';
import { TestProcessor } from './processors/tests.processor';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('MCP_CREDENTIAL_SECRET'),
        signOptions: { expiresIn: '5m' },
      }),
    }),
  ],
  controllers: [MCPController],
  providers: [
    MCPService,
    HelperService,
    TestProcessor,
    AutomationProcessor,
    OpenAIService,
    KeyGuard,
  ],
  exports: [MCPService],
})
export class MCPModule { }