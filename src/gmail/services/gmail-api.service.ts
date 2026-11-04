import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { BackoffOptions, HTTP_TIMEOUT_MS, retryWithBackoff } from '../../common/resilience';
import { ParsedEmail } from '../../emails/interfaces/email.interface';
import { GMAIL_URLS } from '../constants/urls';
import { GmailHistoryExpiredException } from '../exceptions/gmail-history-expired.exception';
import {
  GmailHistoryResponse,
  GmailMessageDetail,
  GmailMessageHeader,
  GmailMessageListResponse,
  GmailMessagePart,
  GmailProfileResponse,
} from '../interfaces/gmail.interface';
import { GmailAuthService } from './gmail-auth.service';
@Injectable()
export class GmailApiService {
  private readonly logger = new Logger(GmailApiService.name);

  /** Retry policy for Gmail reads. Public-ish so tests can swap the sleep. */
  private readonly backoff: BackoffOptions = {
    // status/code only: the axios error's `config` carries the Bearer header.
    onRetry: (err, attempt, delayMs) => {
      const e = err as { code?: string; response?: { status?: number } };
      this.logger.warn(`Gmail request failed (${e?.response?.status ?? e?.code ?? 'unknown'}), retry ${attempt} in ${delayMs}ms`);
    },
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly gmailAuthService: GmailAuthService,
  ) { }

  private get<T>(url: string, token: string, params?: Record<string, unknown>): Promise<{ data: T }> {
    return retryWithBackoff(
      () => firstValueFrom(
        this.httpService.get<T>(url, {
          headers: { Authorization: `Bearer ${token}` },
          ...(params && { params }),
          timeout: HTTP_TIMEOUT_MS.gmail,
        }),
      ),
      this.backoff,
    );
  }

  async getNewMessageIds(userId: number, startHistoryId: string): Promise<string[]> {
    const token = await this.gmailAuthService.getValidToken(userId);
    const messageIds = new Set<string>();
    let pageToken: string | undefined;

    try {
      // history.list is paginated; stopping at the first page would drop the
      // rest while the caller still moves the cursor past them.
      do {
        const response = await this.get<GmailHistoryResponse>(`${GMAIL_URLS.API_BASE}/history`, token, {
          startHistoryId,
          historyTypes: 'messageAdded',
          ...(pageToken && { pageToken }),
        });
        for (const record of response.data.history ?? []) {
          for (const added of record.messagesAdded ?? []) messageIds.add(added.message.id);
        }
        pageToken = response.data.nextPageToken;
      } while (pageToken);
    } catch (err) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        throw new GmailHistoryExpiredException();
      }
      throw err;
    }

    this.logger.debug(`History API returned ${messageIds.size} new message(s) for user ${userId}`);
    return [...messageIds];
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

  /** Ids of mail from the last `days` days, capped at `max`, oldest first (Gmail lists newest first). */
  async listRecentMessageIds(userId: number, days: number, max: number): Promise<string[]> {
    const token = await this.gmailAuthService.getValidToken(userId);
    const response = await this.get<GmailMessageListResponse>(GMAIL_URLS.MESSAGES, token, {
      q: `newer_than:${days}d`,
      maxResults: max,
    });
    return (response.data.messages ?? []).map((m) => m.id).reverse();
  }

  /**
   * The mailbox's current history id (users.getProfile, 1 quota unit). A
   * catch-up pass compares it with the stored cursor: equal means nothing has
   * changed, so history.list isn't called at all.
   */
  async getCurrentHistoryId(userId: number): Promise<string> {
    const token = await this.gmailAuthService.getValidToken(userId);
    const response = await this.get<GmailProfileResponse>(GMAIL_URLS.PROFILE, token);
    return response.data.historyId;
  }

  async fetchMessage(userId: number, messageId: string): Promise<ParsedEmail> {
    const token = await this.gmailAuthService.getValidToken(userId);
    const response = await this.get<GmailMessageDetail>(`${GMAIL_URLS.MESSAGES}/${messageId}`, token, { format: 'full' });
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
