import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isRateLimited } from '../../common/resilience';
import { UserEntity } from '../../users/entities/user.entity';
import { UserService } from '../../users/users.service';
import { GmailReconnectRequiredException } from '../exceptions/gmail-reconnect-required.exception';
import { GmailApiService } from './gmail-api.service';
import { GmailProcessingService } from './gmail-processing.service';

/**
 * Gmail push is best effort: notifications can be delayed or dropped, and a
 * pass that hit a rate limit leaves its cursor where it was with nothing to
 * wake it until the next push. This closes that gap on a timer.
 *
 * Per connected mailbox it asks Gmail for the current history id (one cheap
 * call) and compares it with the stored cursor. Equal means nothing happened;
 * different means a queue-only pass up to that id, through the same
 * per-mailbox guard as live pushes. It stores no state of its own: the cursor
 * is the only memory, and the pass moves it.
 *
 * Proposals only, never edits to the table: this is mail that arrived without
 * its push, so by the time it is read the user may well have acted on it.
 */
@Injectable()
export class GmailCatchUpService {
  private readonly logger = new Logger(GmailCatchUpService.name);
  private ticking = false;

  constructor(
    private readonly userService: UserService,
    private readonly gmailApiService: GmailApiService,
    private readonly processingService: GmailProcessingService,
  ) { }

  @Cron('*/15 * * * *')
  async catchUpAll(): Promise<void> {
    if (this.ticking) {
      this.logger.warn('The previous catch-up run is still going — skipping this tick');
      return;
    }
    this.ticking = true;
    try {
      const users = await this.userService.findUsersWithGmail();
      for (const user of users) await this.catchUp(user);
    } catch (err) {
      this.logger.error(`Catch-up run failed: ${(err as { message?: string })?.message ?? err}`);
    } finally {
      this.ticking = false;
    }
  }

  private async catchUp(user: Pick<UserEntity, 'userId' | 'gmailEmail' | 'gmailHistoryId'>): Promise<void> {
    // No cursor yet means the watch hasn't been seeded: nothing to catch up from.
    if (!user.gmailEmail || !user.gmailHistoryId) return;
    try {
      const current = await this.gmailApiService.getCurrentHistoryId(user.userId);
      if (current === user.gmailHistoryId) return;
      this.logger.log(`Catching up user ${user.userId}: mailbox is at ${current}, cursor at ${user.gmailHistoryId}`);
      await this.processingService.processNotification(user.gmailEmail, current, { queueOnly: true });
    } catch (err) {
      if (err instanceof GmailReconnectRequiredException) {
        this.logger.warn(`Catch-up skipped for user ${user.userId}: Gmail needs to be reconnected`);
        return;
      }
      if (isRateLimited(err)) {
        this.logger.warn(`Catch-up for user ${user.userId} was rate limited — the next run will try again`);
        return;
      }
      // message/status only — the axios error's `config` carries the Bearer header.
      const e = err as { message?: string; response?: { status?: number } };
      this.logger.error(
        `Catch-up failed for user ${user.userId}: ${e?.message ?? err}` + (e?.response?.status ? ` [HTTP ${e.response.status}]` : ''),
      );
    }
  }
}
