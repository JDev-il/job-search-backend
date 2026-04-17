import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../users/users.service';
import { GmailWatchResponse } from '../interfaces/gmail.interface';
import { GmailAuthService } from './gmail-auth.service';

const GMAIL_WATCH_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/watch';

@Injectable()
export class GmailWatchService {
  private readonly logger = new Logger(GmailWatchService.name);
  private readonly pubSubTopic: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly gmailAuthService: GmailAuthService,
    private readonly userService: UserService,
  ) {
    this.pubSubTopic = this.configService.get<string>('GMAIL_PUBSUB_TOPIC');
  }

  async registerWatch(userId: number, gmailEmail: string): Promise<void> {
    const token = await this.gmailAuthService.getValidToken(userId);
    try {
      const response = await firstValueFrom(
        this.httpService.post<GmailWatchResponse>(
          GMAIL_WATCH_URL,
          { topicName: this.pubSubTopic, labelIds: ['INBOX'] },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      const { historyId } = response.data;
      await this.userService.saveGmailWatchData(userId, historyId, gmailEmail);
      this.logger.log(`Watch registered for user ${userId} (${gmailEmail}), historyId=${historyId}`);
    }
    catch {
      this.logger.error(`Error registering to Gmail account for user: {id: ${userId}, email: ${gmailEmail}}`);
    }
  }

  async renewWatch(userId: number): Promise<void> {
    const user = await this.userService.findOneById(userId);
    if (!user.gmailEmail) return;
    await this.registerWatch(userId, user.gmailEmail);
    this.logger.log(`Watch renewed for user ${userId}`);
  }

  /** Re-register watches for all connected users every 6 days (Gmail watch expires after 7 days) */
  @Cron('0 0 */6 * *')
  async renewAllWatches(): Promise<void> {
    const users = await this.userService.findUsersWithGmail();
    this.logger.log(`Renewing Gmail watches for ${users.length} user(s)`);
    await Promise.all(users.map((u) => this.renewWatch(u.userId)));
  }
}
