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
import { GmailHistoryExpiredException } from '../exceptions/gmail-history-expired.exception';
import { GmailApiService } from './gmail-api.service';

/** A pass that has run this long is presumed stuck; a new notification may start its own. */
const STALE_PASS_MS = 20 * 60_000;

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

  /**
   * Mailboxes with a pass in flight, and the latest historyId that arrived
   * for each while it ran. Process-local coordination, nothing is persisted:
   * with several app instances it degrades to the old behaviour, no worse.
   */
  private readonly running = new Map<string, { startedAt: number }>();
  private readonly queued = new Map<string, string>();

  /**
   * Gmail pushes one notification per change, seconds apart when several
   * emails land together, and each handler runs unawaited. Overlapping passes
   * would all read the same stored cursor and fetch + classify the same
   * messages again (a full message fetch is 60 quota units, plus an LLM call).
   * So only one pass runs per mailbox; anything arriving meanwhile is folded
   * into a single follow-up pass, which re-reads the cursor and so also covers
   * what the earlier notifications announced.
   *
   * Requests have timeouts, so a pass normally ends. If one is still "running"
   * after STALE_PASS_MS anyway, it is presumed stuck and the next notification
   * takes over rather than queueing behind it forever.
   */
  public async processNotification(emailAddress: string, newHistoryId: string): Promise<void> {
    const key = (emailAddress ?? '').toLowerCase();
    const current = this.running.get(key);
    if (current && Date.now() - current.startedAt < STALE_PASS_MS) {
      this.queued.set(key, newHistoryId);
      return;
    }
    if (current) {
      this.logger.warn(`A pass for ${emailAddress} has been running for over ${STALE_PASS_MS / 60_000} minutes — starting a new one`);
    }

    const mine = { startedAt: Date.now() };
    this.running.set(key, mine);
    try {
      let next: string | undefined = newHistoryId;
      while (next !== undefined) {
        this.queued.delete(key);
        await this.processOnce(emailAddress, next);
        if (this.running.get(key) !== mine) break; // taken over while stuck: the newer pass owns the queue now
        next = this.queued.get(key);
      }
    } finally {
      // A failed pass never advanced the cursor, so whatever was queued behind
      // it is still covered by the next notification's read from that cursor.
      if (this.running.get(key) === mine) {
        this.running.delete(key);
        this.queued.delete(key);
      }
    }
  }

  private async processOnce(emailAddress: string, newHistoryId: string): Promise<void> {
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

    let messageIds: string[];
    try {
      messageIds = await this.gmailApiService.getNewMessageIds(user.userId, user.gmailHistoryId);
    } catch (err) {
      if (!(err instanceof GmailHistoryExpiredException)) throw err;
      // Gmail dropped the history for this cursor, so the mail in between can't
      // be read any more. Restart from this notification; leaving the stale
      // cursor would fail every later push the same way.
      this.logger.warn(
        `Gmail history for user ${user.userId} has expired (cursor ${user.gmailHistoryId}) — restarting from ${newHistoryId}; mail received in between was not processed`,
      );
      await this.userService.updateGmailHistoryId(user.userId, newHistoryId);
      return;
    }
    this.logger.log(`Processing ${messageIds.length} new message(s) for user ${user.userId}`);

    for (const messageId of messageIds) {
      try {
        const parsedEmail = await this.gmailApiService.fetchMessage(user.userId, messageId);
        // Never log message content (subject/body): it is restricted Gmail
        // user data and the server logs are not a place it should end up.
        this.logger.debug(
          `[${messageId}] fetched: senderDomain=${parsedEmail.senderDomain ?? 'n/a'}, bodyChars=${parsedEmail.bodyText.length}`,
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
