import { Body, Controller, HttpCode, Logger, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    if (token !== this.webhookToken) {
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
}
