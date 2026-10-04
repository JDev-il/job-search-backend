import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { GOOGLE_AUTH_URL, GOOGLE_REVOKE_URL } from '../../auth/constants';
import { UserService } from '../../users/users.service';
import { GMAIL_URLS } from '../constants/urls';
import { GmailHelperService } from './gmail-helper.service';

const OAUTH_STATE_PURPOSE = 'gmail-oauth-state';

@Injectable()
export class GmailAuthService {
  private readonly logger = new Logger(GmailAuthService.name);
  private readonly clientId: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly userService: UserService,
    private readonly gmailHelperService: GmailHelperService,
    private readonly jwtService: JwtService,
  ) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.redirectUri = this.configService.get<string>('GOOGLE_GMAIL_REDIRECT_URI');
  }

  public getAuthUrl(userId: number): string {
    // `state` used to be a raw, unsigned userId: anyone completing their
    // OWN Google consent could call the callback with a different userId
    // as `state` and have their Gmail tokens saved onto that other
    // account. Signing it closes that off — the callback only accepts a
    // state it (or rather, we) actually issued, for that exact userId.
    const state = this.jwtService.sign(
      { userId, purpose: OAUTH_STATE_PURPOSE },
      { secret: this.configService.get<string>('JWT_SECRET_KEY'), expiresIn: '10m' },
    );
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: GMAIL_URLS.SCOPE,
      access_type: 'offline',
      prompt: 'consent', // ensures refresh_token is always returned
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  public verifyStateToken(state: string): number {
    try {
      const payload = this.jwtService.verify<{ userId: number; purpose: string }>(state, {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
      });
      if (payload.purpose !== OAUTH_STATE_PURPOSE || typeof payload.userId !== 'number') {
        throw new Error('Unexpected state payload');
      }
      return payload.userId;
    } catch {
      throw new UnauthorizedException('Invalid or expired Gmail OAuth state');
    }
  }

  public async exchangeCodeForTokens(code: string, userId: number): Promise<{ gmailEmail: string }> {
    const response = await this.gmailHelperService.gmailToken(code);
    const { access_token, refresh_token, expires_in } = response.data;
    const expiry = new Date(Date.now() + expires_in * 1000);
    const profile = await this.gmailHelperService.gmailProfile(access_token);
    const gmailEmail = profile.data.emailAddress;

    await this.userService.saveGmailTokens(userId, access_token, refresh_token, expiry, gmailEmail);

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
          this.httpService.post(`${GOOGLE_REVOKE_URL}?token=${tokens.gmailAccessToken}`),
        );
      } catch {
        this.logger.warn(`Failed to revoke Google token for user ${userId} — clearing DB anyway`);
      }
    }
    await this.userService.clearGmailTokens(userId);
    this.logger.log(`Gmail disconnected for user ${userId}`);
  }

  private async refreshAccessToken(userId: number, refreshToken: string): Promise<string> {
    const response = await this.gmailHelperService.gmailRefreshAccessToken(refreshToken);

    const { access_token, expires_in } = response.data;
    const expiry = new Date(Date.now() + expires_in * 1000);

    await this.userService.updateGmailAccessToken(userId, access_token, expiry);
    this.logger.log(`Access token refreshed for user ${userId}`);

    return access_token;
  }
}
