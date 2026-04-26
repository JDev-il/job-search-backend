import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ParsedEmail } from '../../emails/interfaces/email.interface';
import { GMAIL_URLS } from '../constants/urls';
import {
  GmailHistoryResponse,
  GmailMessageDetail,
  GmailMessageHeader,
  GmailMessageListResponse,
  GmailMessagePart,
} from '../interfaces/gmail.interface';
import { GmailAuthService } from './gmail-auth.service';
@Injectable()
export class GmailApiService {
  private readonly logger = new Logger(GmailApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly gmailAuthService: GmailAuthService,
  ) { }

  async getNewMessageIds(userId: number, startHistoryId: string): Promise<string[]> {
    const token = await this.gmailAuthService.getValidToken(userId);
    const response = await firstValueFrom(
      this.httpService.get<GmailHistoryResponse>(`${GMAIL_URLS.API_BASE}/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startHistoryId, historyTypes: 'messageAdded', labelId: 'INBOX' },
      }),
    );

    const messageIds = (response.data.history ?? [])
      .flatMap((h) => h.messagesAdded ?? [])
      .map((m) => m.message.id);

    this.logger.debug(`History API returned ${messageIds.length} new message(s) for user ${userId}`);
    return messageIds;
  }

  async listUnreadMessageIds(userId: number): Promise<string[]> {
    const token = await this.gmailAuthService.getValidToken(userId);
    const response = await firstValueFrom(
      this.httpService.get<GmailMessageListResponse>(`${GMAIL_URLS.API_BASE}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: 'is:unread', maxResults: 20 },
      }),
    );

    const ids = response.data.messages?.map((m) => m.id) ?? [];
    this.logger.debug(`Found ${ids.length} unread message(s) for user ${userId}`);
    return ids;
  }

  async fetchMessage(userId: number, messageId: string): Promise<ParsedEmail> {
    const token = await this.gmailAuthService.getValidToken(userId);
    const response = await firstValueFrom(
      this.httpService.get<GmailMessageDetail>(`${GMAIL_URLS.MESSAGES}/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { format: 'full' },
      }),
    );

    return this.parseMessage(response.data);
  }

  private parseMessage(detail: GmailMessageDetail): ParsedEmail {
    const headers = detail.payload.headers ?? [];
    const subject = this.getHeader(headers, 'Subject') ?? '(no subject)';
    const from = this.getHeader(headers, 'From') ?? '';
    const { sender, senderDisplayName, senderDomain } = this.parseSender(from);
    const bodyText = this.extractBody(detail.payload);
    return {
      messageId: detail.id,
      threadId: detail.threadId,
      subject,
      bodyText,
      snippet: detail.snippet,
      sender,
      senderDisplayName,
      senderDomain,
    };
  }

  private getHeader(headers: GmailMessageHeader[], name: string): string | undefined {
    return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  }

  private parseSender(from: string): { sender: string; senderDisplayName?: string; senderDomain?: string } {
    // "Display Name <email@domain.com>" or just "email@domain.com"
    const angleMatch = from.match(/^\s*"?([^"<]*?)"?\s*<(.+)>\s*$/);
    let email: string;
    let senderDisplayName: string | undefined;
    if (angleMatch) {
      senderDisplayName = angleMatch[1].trim() || undefined;
      email = angleMatch[2];
    } else {
      const bare = from.match(/(\S+@\S+)/);
      email = bare?.[1] ?? from;
    }
    const domainMatch = email.match(/@(.+)$/);
    return {
      sender: email.trim(),
      senderDisplayName,
      senderDomain: domainMatch?.[1],
    };
  }

  private extractBody(part: GmailMessagePart): string {
    // Prefer plain text part; fall back to html; fall back to top-level body
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return this.decodeBase64(part.body.data);
    }

    if (part.parts) {
      for (const child of part.parts) {
        const text = this.extractBody(child);
        if (text) return text;
      }
    }

    if (part.body?.data) {
      return this.decodeBase64(part.body.data);
    }

    return '';
  }

  private decodeBase64(data: string): string {
    // Gmail uses base64url (- and _ instead of + and /)
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
}
