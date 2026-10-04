import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from '../emails/email-intelligence.module';
import { JobSearchModule } from '../job-search/job-search.module';
import { PendingActionsModule } from '../pending-actions/pending-actions.module';
import { UsersModule } from '../users/users.module';
import { GmailHelperService } from './services/gmail-helper.service';
import { GmailAuthController } from './controllers/gmail-auth.controller';
import { GmailWebhookController } from './controllers/gmail-webhook.controller';
import { GmailApiService } from './services/gmail-api.service';
import { GmailAuthService } from './services/gmail-auth.service';
import { GmailProcessingService } from './services/gmail-processing.service';
import { GmailWatchService } from './services/gmail-watch.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    // Needed so GmailAuthService can sign/verify the OAuth `state` param
    // as a short-lived JWT instead of trusting a raw userId (see below).
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_KEY'),
      }),
    }),
    UsersModule,
    EmailModule,
    JobSearchModule,
    PendingActionsModule,
  ],
  controllers: [GmailAuthController, GmailWebhookController],
  providers: [GmailAuthService, GmailApiService, GmailWatchService, GmailProcessingService, GmailHelperService],
  exports: [GmailAuthService, GmailApiService, GmailWatchService, GmailProcessingService],
})
export class GmailModule {}
