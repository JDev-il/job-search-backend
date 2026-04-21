import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";
import { GOOGLE_TOKEN_URL } from "../../auth/constants";
import { GMAIL_URLS } from "../constants/urls";
import { GmailTokenResponse } from "../interfaces/gmail.interface";
@Injectable()
export class GmailHelperService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('GOOGLE_GMAIL_REDIRECT_URI');
  }

  async gmailProfile(access_token: string): Promise<AxiosResponse> {
    return await firstValueFrom(
      this.httpService.get<{ emailAddress: string }>(GMAIL_URLS.PROFILE, {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
    )
  }

  async gmailToken(code: string): Promise<AxiosResponse> {
    return await firstValueFrom(
      this.httpService.post<GmailTokenResponse>(GOOGLE_TOKEN_URL, {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    )
  }

  async gmailRefreshAccessToken(refreshToken: string): Promise<AxiosResponse> {
    return await firstValueFrom(
      this.httpService.post<GmailTokenResponse>(GOOGLE_TOKEN_URL, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    );
  }
}
