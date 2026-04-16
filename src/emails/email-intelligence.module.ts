import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from '../mcp/openai/openai.service';
import { HelperService } from './../services/helper.service';
import { EmailController } from './email.controller';
import { EmailIntentMapper } from './mapper/email-intent.mapper';
import { EmailClassificationService } from './services/email-classification.service';
import { EmailLLMClassificationService } from './services/email-llm-classification.service';
import { EmailNormalizerService } from './services/email-normalize.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  controllers: [EmailController],
  providers: [
    HelperService,
    EmailClassificationService,
    EmailNormalizerService,
    EmailLLMClassificationService,
    EmailIntentMapper,
    OpenAIService,
  ],
  exports: [HelperService, EmailClassificationService, EmailNormalizerService, EmailIntentMapper],
})
export class EmailModule { }
