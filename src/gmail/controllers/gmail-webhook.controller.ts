import { Body, Controller, HttpCode, Logger, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PubSubEmailNotification, PubSubWebhookDto } from '../dto/pubsub-webhook.dto';
import { GmailProcessingService } from '../services/gmail-processing.service';

@Controller('gmail')
export class GmailWebhookController {
  private readonly logger = new Logger(GmailWebhookController.name);
  private readonly webhookToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly processingService: GmailProcessingService,
  ) {
    this.webhookToken = this.configService.get<string>('PUBSUB_WEBHOOK_TOKEN');
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Query('token') token: string,
    @Body() body: PubSubWebhookDto,
  ): Promise<void> {
    if (!this.isValidToken(token)) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    let notification: PubSubEmailNotification;
    try {
      const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8');
      notification = JSON.parse(decoded) as PubSubEmailNotification;
    } catch {
      this.logger.warn('Failed to decode Pub/Sub message data — ignoring');
      return;
    }

    const { emailAddress, historyId } = notification;
    this.logger.log(`Pub/Sub notification: emailAddress=${emailAddress}, historyId=${historyId}`);

    // Fire-and-forget: always return 200 so Pub/Sub doesn't retry
    this.processingService.processNotification(emailAddress, historyId).catch((err) => {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const url = err?.config?.url;
      this.logger.error(
        `processNotification failed: ${err.message}` +
        (status ? ` [HTTP ${status} from ${url}]` : '') +
        (data ? ` body=${JSON.stringify(data)}` : ''),
      );
    });
  }

  // Pub/Sub push subscriptions don't support a custom header, and the push
  // body's shape and attributes come from whoever publishes to the topic
  // (Gmail's own watch mechanism), not from us — so a query-string token is
  // the only secret-we-control option short of full OIDC (which needs a
  // push-auth service account provisioned in GCP; tracked separately).
  // This at least removes the `!==` timing side-channel on the comparison.
  private isValidToken(token: string): boolean {
    if (!token || !this.webhookToken) {
      return false;
    }
    const provided = Buffer.from(token);
    const expected = Buffer.from(this.webhookToken);
    if (provided.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(provided, expected);
  }
}
