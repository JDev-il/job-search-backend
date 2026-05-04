import { Injectable, Logger } from '@nestjs/common';
import { EmailIntent } from '../../emails/enums/email.enum';
import { EmailClassificationResult, ParsedEmail } from '../../emails/interfaces/email.interface';
import { EmailClassificationService } from '../../emails/services/email-classification.service';
import { JobSearchEntity } from '../../job-search/entities/job-search.entity';
import { JobSearchService } from '../../job-search/job-search.service';
import { PendingActionType } from '../../pending-actions/enums/pending-action.enum';
import {
  PendingActionEvidence,
  PendingActionProposedChange,
} from '../../pending-actions/interfaces/pending-action.interface';
import { PendingActionsService } from '../../pending-actions/services/pending-actions.service';
import { UserService } from '../../users/users.service';
import { ATS_DOMAINS } from '../constants/gmail-data';
import { GmailApiService } from './gmail-api.service';

@Injectable()
export class GmailProcessingService {
  private readonly logger = new Logger(GmailProcessingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly gmailApiService: GmailApiService,
    private readonly classificationService: EmailClassificationService,
    private readonly jobSearchService: JobSearchService,
    private readonly pendingActionsService: PendingActionsService,
  ) { }

  public async processNotification(emailAddress: string, newHistoryId: string): Promise<void> {
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
        this.logger.debug(
          `[${messageId}] subject="${parsedEmail.subject}" body[0..300]="${parsedEmail.bodyText.slice(0, 300).replace(/\s+/g, ' ')}"`,
        );
        const result = await this.classificationService.classify(parsedEmail);

        this.logger.log(
          `[${messageId}] intent=${result.intent}, status=${result.suggestedStatus}, domain=${parsedEmail.senderDomain}`,
        );

        if (result.suggestedStatus && parsedEmail.senderDomain) {
          await this.routeClassifiedEmail(user.userId, parsedEmail, result);
        }
      } catch (err) {
        const e = err as { message?: string; response?: { status?: number; data?: unknown }; config?: { url?: string } };
        const status = e.response?.status;
        const data = e.response?.data;
        const url = e.config?.url;
        this.logger.error(
          `Failed to process message ${messageId}: ${e.message ?? err}` +
          (status ? ` [HTTP ${status} from ${url}]` : '') +
          (data ? ` body=${JSON.stringify(data)}` : ''),
        );
      }
    }

    await this.userService.updateGmailHistoryId(user.userId, newHistoryId);
  }

  /**
   * Routing rules:
   *  - rules-source classifications with a match → auto-apply (keeps current behavior).
   *  - LLM-source classifications → emit STATUS_CHANGE pending action.
   *  - ATS-domain sender, regardless of source → emit LINK_THREAD_TO_APPLICATION
   *    with a candidate set, since the domain stub ("workday") gives no signal.
   *  - No match + intent=CONFIRMATION → emit AUTO_CREATE_APPLICATION.
   *  - No match + intent≠CONFIRMATION + plausible company → emit LINK_THREAD_TO_APPLICATION.
   *  - No match + nothing actionable → skip silently (existing behavior).
   */
  private async routeClassifiedEmail(
    userId: number,
    email: ParsedEmail,
    result: EmailClassificationResult,
  ): Promise<void> {
    const senderDomain = email.senderDomain!;
    const suggestedStatus = result.suggestedStatus!;
    const isAts = this.isAtsDomain(senderDomain);

    // Thread-based fast path: a previous accept already linked this thread.
    if (email.threadId) {
      const linked = await this.jobSearchService.findByThreadId(userId, email.threadId);
      if (linked) {
        await this.proposeOrApplyStatusChange(userId, email, result, linked, /*forceQueue*/ false);
        return;
      }
    }

    if (isAts) {
      await this.emitLinkThreadAction(userId, email, result);
      return;
    }

    const companyName = this.extractCompanyName(senderDomain);
    const existing = await this.jobSearchService.findMatchingApplication(userId, companyName);

    if (existing) {
      // Force queue when LLM was the source — we don't auto-apply lower-confidence calls.
      const forceQueue = result.source === 'llm';
      await this.proposeOrApplyStatusChange(userId, email, result, existing, forceQueue);
      return;
    }

    if (result.intent === EmailIntent.CONFIRMATION) {
      await this.emitAutoCreateAction(userId, email, result, companyName);
      return;
    }

    if (companyName) {
      await this.emitLinkThreadAction(userId, email, result, companyName);
      return;
    }

    this.logger.log(
      `No match for "${companyName}" and intent is ${result.intent} — skipping`,
    );
  }

  private async proposeOrApplyStatusChange(
    userId: number,
    email: ParsedEmail,
    result: EmailClassificationResult,
    target: JobSearchEntity,
    forceQueue: boolean,
  ): Promise<void> {
    const suggestedStatus = result.suggestedStatus!;

    if (!forceQueue && result.source === 'rules') {
      // Rules path: status came from the deterministic INTENT_TO_STATUS table
      // valid by construction. Auto-apply.
      await this.jobSearchService.setStatus(userId, target.jobId, suggestedStatus);
      this.logger.log(
        `Auto-applied job ${target.jobId} (${target.companyName}) → ${suggestedStatus}`,
      );
      return;
    }

    // Queue for user confirmation.
    const evidence = this.buildEvidence(email, result);
    const proposed: PendingActionProposedChange = {
      kind: PendingActionType.StatusChange,
      jobId: target.jobId,
      fromStatus: target.status,
      toStatus: suggestedStatus,
      intent: result.intent,
    };
    await this.pendingActionsService.create({
      userId,
      jobId: target.jobId,
      type: PendingActionType.StatusChange,
      evidence,
      proposedChange: proposed,
      question: `Mark "${target.companyName}" as ${suggestedStatus}?`,
      gmailMessageId: email.messageId,
    });
  }

  private async emitAutoCreateAction(
    userId: number,
    email: ParsedEmail,
    result: EmailClassificationResult,
    companyName: string,
  ): Promise<void> {
    const evidence = this.buildEvidence(email, result, { extractedCompanyName: companyName });
    const proposed: PendingActionProposedChange = {
      kind: PendingActionType.AutoCreateApplication,
      companyName,
      status: result.suggestedStatus!,
      intent: result.intent,
      threadId: email.threadId,
    };
    await this.pendingActionsService.create({
      userId,
      type: PendingActionType.AutoCreateApplication,
      evidence,
      proposedChange: proposed,
      question: `Add a new application for "${companyName}" (${result.suggestedStatus})?`,
      gmailMessageId: email.messageId,
    });
  }

  private async emitLinkThreadAction(
    userId: number,
    email: ParsedEmail,
    result: EmailClassificationResult,
    fallbackCompanyName?: string,
  ): Promise<void> {
    if (!email.threadId) {
      this.logger.debug(
        `[${email.messageId}] no threadId — cannot emit LINK_THREAD_TO_APPLICATION`,
      );
      return;
    }
    const candidates = await this.jobSearchService.findLinkCandidates(
      userId,
      {
        companyName: fallbackCompanyName,
        senderDisplayName: email.senderDisplayName,
        subject: email.subject,
      },
      5,
    );
    if (candidates.length === 0) {
      this.logger.log(
        `[${email.messageId}] no candidate applications to link — skipping`,
      );
      return;
    }
    const evidence = this.buildEvidence(email, result, {
      isAtsDomain: this.isAtsDomain(email.senderDomain ?? ''),
      extractedCompanyName: fallbackCompanyName,
      candidates: candidates.map(c => ({
        jobId: c.jobId,
        companyName: c.companyName,
        status: c.status,
        applicationDate: c.applicationDate,
      })),
    });
    const intentValid = result.suggestedStatus !== undefined;
    const proposed: PendingActionProposedChange = {
      kind: PendingActionType.LinkThreadToApplication,
      threadId: email.threadId,
      intent: result.intent,
      toStatus: intentValid ? result.suggestedStatus : undefined,
    };
    const hint = email.senderDisplayName ?? fallbackCompanyName ?? email.senderDomain ?? 'this thread';
    await this.pendingActionsService.create({
      userId,
      type: PendingActionType.LinkThreadToApplication,
      evidence,
      proposedChange: proposed,
      question: `Which application does this email from "${hint}" belong to?`,
      gmailMessageId: email.messageId,
    });
  }

  private buildEvidence(
    email: ParsedEmail,
    result: EmailClassificationResult,
    extra: Partial<PendingActionEvidence> = {},
  ): PendingActionEvidence {
    return {
      gmailMessageId: email.messageId,
      gmailThreadId: email.threadId,
      senderDomain: email.senderDomain,
      senderDisplayName: email.senderDisplayName,
      subject: email.subject,
      snippet: email.snippet?.slice(0, 240),
      classification: {
        intent: result.intent,
        confidence: result.confidence,
        source: result.source,
        reasoning: result.reasoning,
      },
      ...extra,
    };
  }

  private isAtsDomain(domain: string): boolean {
    const lower = domain.toLowerCase();
    return ATS_DOMAINS.some(ats => lower === ats || lower.endsWith(`.${ats}`));
  }

  /** amazon.co.uk → amazon, mail.google.com → google */
  private extractCompanyName(domain: string): string {
    const parts = domain.split('.');
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }
}
