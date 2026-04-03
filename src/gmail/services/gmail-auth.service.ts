import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../users/users.service';
import { GmailTokenResponse } from '../interfaces/gmail.interface';

const GMAIL_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

@Injectable()
export class GmailAuthService {
  private readonly logger = new Logger(GmailAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly userService: UserService,
  ) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('GOOGLE_GMAIL_REDIRECT_URI');
  }

  public getAuthUrl(userId: number): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPE,
      access_type: 'offline',
      prompt: 'consent', // ensures refresh_token is always returned
      state: String(userId),
    });
    return `${GMAIL_AUTH_URL}?${params.toString()}`;
  }

  public async exchangeCodeForTokens(code: string, userId: number): Promise<{ gmailEmail: string }> {
    const response = await firstValueFrom(
      this.httpService.post<GmailTokenResponse>(GMAIL_TOKEN_URL, {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    );

    const { access_token, refresh_token, expires_in } = response.data;
    const expiry = new Date(Date.now() + expires_in * 1000);

    await this.userService.saveGmailTokens(userId, access_token, refresh_token, expiry);

    const user = await this.userService.findOneById(userId);
    const gmailEmail = user.email;

    this.logger.log(`Gmail tokens saved for user ${userId}, email=${gmailEmail}`);
    return { gmailEmail };
  }

  public async getValidToken(userId: number): Promise<string> {
    const tokens = await this.userService.getGmailTokens(userId);

    if (!tokens?.gmailAccessToken || !tokens?.gmailRefreshToken) {
      throw new UnauthorizedException(`User ${userId} has not connected Gmail`);
    }

    const isExpired = !tokens.gmailTokenExpiry || new Date() >= tokens.gmailTokenExpiry;
    if (!isExpired) {
      return tokens.gmailAccessToken;
    }

    return this.refreshAccessToken(userId, tokens.gmailRefreshToken);
  }

  public async getGmailStatus(userId: number): Promise<{ gmailEmail: string | null }> {
    const tokens = await this.userService.getGmailTokens(userId);
    return { gmailEmail: tokens?.gmailEmail ?? null };
  }

  public async disconnectGmail(userId: number): Promise<void> {
    const tokens = await this.userService.getGmailTokens(userId);
    if (tokens?.gmailAccessToken) {
      try {
        await firstValueFrom(
          this.httpService.post(`https://oauth2.googleapis.com/revoke?token=${tokens.gmailAccessToken}`),
        );
      } catch {
        this.logger.warn(`Failed to revoke Google token for user ${userId} — clearing DB anyway`);
      }
    }
    await this.userService.clearGmailTokens(userId);
    this.logger.log(`Gmail disconnected for user ${userId}`);
  }

  private async refreshAccessToken(userId: number, refreshToken: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post<GmailTokenResponse>(GMAIL_TOKEN_URL, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    );

    const { access_token, expires_in } = response.data;
    const expiry = new Date(Date.now() + expires_in * 1000);

    await this.userService.updateGmailAccessToken(userId, access_token, expiry);
    this.logger.log(`Access token refreshed for user ${userId}`);

    return access_token;
  }
}
