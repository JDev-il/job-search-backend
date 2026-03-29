import { Injectable, Logger } from '@nestjs/common';
import { EmailIntent } from '../../ai/emails/enums/email.enum';
import { EmailClassificationService } from '../../ai/emails/services/email-classification.service';
import { ApplicationStatus } from '../../applications/enums/application-status.enum';
import { JobSearchService } from '../../job-search/job-search.service';
import { UserService } from '../../users/users.service';
import { GmailApiService } from './gmail-api.service';

@Injectable()
export class GmailProcessingService {
  private readonly logger = new Logger(GmailProcessingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly gmailApiService: GmailApiService,
    private readonly classificationService: EmailClassificationService,
    private readonly jobSearchService: JobSearchService,
  ) {}

  async processNotification(emailAddress: string, newHistoryId: string): Promise<void> {
    const user = await this.userService.findByGmailEmail(emailAddress);
    if (!user) {
      this.logger.warn(`No user found for Gmail address: ${emailAddress}`);
      return;
    }

    if (!user.gmailHistoryId) {
      this.logger.warn(`User ${user.userId} has no stored historyId — skipping`);
      await this.userService.updateGmailHistoryId(user.userId, newHistoryId);
      return;
    }

    const messageIds = await this.gmailApiService.getNewMessageIds(user.userId, user.gmailHistoryId);
    this.logger.log(`Processing ${messageIds.length} new message(s) for user ${user.userId}`);

    for (const messageId of messageIds) {
      try {
        const parsedEmail = await this.gmailApiService.fetchMessage(user.userId, messageId);
        const result = await this.classificationService.classify(parsedEmail);

        this.logger.log(
          `[${messageId}] intent=${result.intent}, status=${result.suggestedStatus}, domain=${parsedEmail.senderDomain}`,
        );

        if (result.suggestedStatus && parsedEmail.senderDomain) {
          const companyName = this.extractCompanyName(parsedEmail.senderDomain);
          await this.matchOrCreate(user.userId, companyName, result.intent, result.suggestedStatus);
        }
      } catch (err) {
        this.logger.error(`Failed to process message ${messageId}: ${err.message}`);
      }
    }

    await this.userService.updateGmailHistoryId(user.userId, newHistoryId);
  }

  private async matchOrCreate(
    userId: number,
    companyName: string,
    intent: EmailIntent,
    suggestedStatus: ApplicationStatus,
  ): Promise<void> {
    const existing = await this.jobSearchService.findMatchingApplication(userId, companyName);

    if (existing) {
      await this.jobSearchService.updateApplication({
        jobId: existing.jobId,
        userId,
        status: suggestedStatus,
        companyName: existing.companyName,
        companyLocation: existing.companyLocation,
        companyCity: existing.companyCity,
        positionType: existing.positionType,
        positionStack: existing.positionStack ?? [],
        applicationPlatform: existing.applicationPlatform,
        applicationDate: existing.applicationDate,
        notes: existing.notes,
        hunch: existing.hunch,
      });
      this.logger.log(`Updated job ${existing.jobId} (${existing.companyName}) → ${suggestedStatus}`);
      return;
    }

    if (intent === EmailIntent.CONFIRMATION) {
      const created = await this.jobSearchService.createAutoApplication(userId, companyName, suggestedStatus);
      this.logger.log(`Auto-created job ${created.jobId} for company "${companyName}" → ${suggestedStatus}`);
    } else {
      this.logger.log(`No match for "${companyName}" and intent is ${intent} — skipping`);
    }
  }

  /** amazon.co.uk → amazon, mail.google.com → google */
  private extractCompanyName(domain: string): string {
    const parts = domain.split('.');
    // drop TLD(s) — take the last meaningful segment before the TLD
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }
}
