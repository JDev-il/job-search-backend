import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '../ai/emails/email-intelligence.module';
import { JobSearchModule } from '../job-search/job-search.module';
import { UsersModule } from '../users/users.module';
import { GmailAuthController } from './controllers/gmail-auth.controller';
import { GmailWebhookController } from './controllers/gmail-webhook.controller';
import { GmailApiService } from './services/gmail-api.service';
import { GmailAuthService } from './services/gmail-auth.service';
import { GmailProcessingService } from './services/gmail-processing.service';
import { GmailWatchService } from './services/gmail-watch.service';

@Module({
  imports: [HttpModule, ConfigModule, UsersModule, EmailModule, JobSearchModule],
  controllers: [GmailAuthController, GmailWebhookController],
  providers: [GmailAuthService, GmailApiService, GmailWatchService, GmailProcessingService],
  exports: [GmailAuthService, GmailApiService, GmailWatchService, GmailProcessingService],
})
export class GmailModule {}
