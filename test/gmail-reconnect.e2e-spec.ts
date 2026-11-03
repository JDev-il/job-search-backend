import { HttpService } from '@nestjs/axios';
import { Controller, Get, INestApplication, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bodyParser from 'body-parser';
import { Request } from 'express';
import * as request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { GmailAuthController } from '../src/gmail/controllers/gmail-auth.controller';
import { GMAIL_RECONNECT_REQUIRED } from '../src/gmail/exceptions/gmail-reconnect-required.exception';
import { GmailAuthService } from '../src/gmail/services/gmail-auth.service';
import { GmailHelperService } from '../src/gmail/services/gmail-helper.service';
import { GmailProcessingService } from '../src/gmail/services/gmail-processing.service';
import { GmailWatchService } from '../src/gmail/services/gmail-watch.service';
import { UserService } from '../src/users/users.service';

/**
 * What a user lives through when Google kills their Gmail grant
 * (invalid_grant), against the real controller + auth service with only the
 * database and Google faked.
 *
 * The point being proven: a dead Gmail grant must never look like a dead
 * login. The app's own session keeps working throughout, and the user can
 * connect Gmail again without logging in again. The client logs the user out
 * on ANY 401 from this API (auth.interceptor.ts), so none of the Gmail
 * failures below may be a 401.
 */

const JWT_SECRET_KEY = 'gmail-reconnect-test-secret';
const config: Record<string, string> = {
  JWT_SECRET_KEY,
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_GMAIL_REDIRECT_URI: 'http://localhost:3000/api/auth/gmail/callback',
};

const NO_GMAIL = {
  gmailAccessToken: null as string | null,
  gmailRefreshToken: null as string | null,
  gmailTokenExpiry: null as Date | null,
  gmailEmail: null as string | null,
  gmailHistoryId: null as string | null,
};

// Stands in for any future endpoint that needs a Gmail access token.
@Controller('probe')
class GmailProbeController {
  constructor(private readonly gmailAuthService: GmailAuthService) { }

  @UseGuards(JwtAuthGuard)
  @Get('gmail-token')
  async token(@Req() req: Request): Promise<{ token: string }> {
    return { token: await this.gmailAuthService.getValidToken((req.user as { userId: number }).userId) };
  }
}

describe('Gmail reconnect after invalid_grant', () => {
  let app: INestApplication;
  let store: typeof NO_GMAIL;

  const helper = {
    gmailRefreshAccessToken: jest.fn(),
    gmailToken: jest.fn(),
    gmailProfile: jest.fn(),
  };
  const gmailWatchService = { registerWatch: jest.fn().mockResolvedValue(undefined) };
  const userService = {
    getGmailTokens: jest.fn(async () => ({ ...store })),
    updateGmailAccessToken: jest.fn(async (_id: number, access: string, expiry: Date) => {
      Object.assign(store, { gmailAccessToken: access, gmailTokenExpiry: expiry });
    }),
    saveGmailTokens: jest.fn(async (_id: number, access: string, refresh: string, expiry: Date, email: string) => {
      Object.assign(store, { gmailAccessToken: access, gmailRefreshToken: refresh, gmailTokenExpiry: expiry, gmailEmail: email });
    }),
    clearGmailTokensIfRefreshToken: jest.fn(async (_id: number, refresh: string) => {
      if (store.gmailRefreshToken !== refresh) return false;
      Object.assign(store, NO_GMAIL);
      return true;
    }),
  };

  const jwt = new JwtService({ secret: JWT_SECRET_KEY });
  const session = `Bearer ${jwt.sign({ userId: 3, email: 'me@example.com' })}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: JWT_SECRET_KEY })],
      controllers: [GmailAuthController, GmailProbeController],
      providers: [
        JwtStrategy,
        GmailAuthService,
        { provide: ConfigService, useValue: { get: (k: string) => config[k] } },
        { provide: GmailHelperService, useValue: helper },
        { provide: GmailWatchService, useValue: gmailWatchService },
        { provide: GmailProcessingService, useValue: {} }, // only used by the backfill endpoint, which this spec doesn't touch
        { provide: UserService, useValue: userService },
        { provide: HttpService, useValue: {} }, // only used by disconnect, which this spec doesn't touch
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(bodyParser.json());
    app.setGlobalPrefix('api');
    await app.init();

    // The grant dies: an expired access token whose refresh token Google now rejects.
    store = {
      gmailAccessToken: 'stale-access',
      gmailRefreshToken: 'dead-refresh',
      gmailTokenExpiry: new Date(Date.now() - 60_000),
      gmailEmail: 'me@gmail.com',
      gmailHistoryId: '100',
    };
    helper.gmailRefreshAccessToken.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 400'), {
        response: { status: 400, data: { error: 'invalid_grant', error_description: 'Bad Request' } },
      }),
    );
    helper.gmailToken.mockResolvedValue({
      data: { access_token: 'fresh-access', refresh_token: 'fresh-refresh', expires_in: 3600 },
    });
    helper.gmailProfile.mockResolvedValue({ data: { emailAddress: 'me@gmail.com' } });
  });
  afterAll(() => app.close());

  // These run in order: each step starts from where the previous one left the user.

  it('1. a request that needs Gmail fails with 409 + GMAIL_RECONNECT_REQUIRED, not 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/probe/gmail-token')
      .set('Authorization', session)
      .expect(409);

    expect(res.body.code).toBe(GMAIL_RECONNECT_REQUIRED);
    expect(userService.clearGmailTokensIfRefreshToken).toHaveBeenCalledWith(3, 'dead-refresh');
    expect(store).toEqual(NO_GMAIL);
  });

  it('2. the user stays logged in: the same session still works and Gmail simply shows as not connected', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/gmail/status')
      .set('Authorization', session)
      .expect(200, { gmailEmail: null });
  });

  // Google sends the browser to the callback, which carries no bearer token at all.
  const reconnectGmail = async () => {
    const urlRes = await request(app.getHttpServer())
      .get('/api/auth/gmail/url')
      .set('Authorization', session)
      .expect(200);
    const state = new URL(urlRes.body.url).searchParams.get('state');
    expect(state).toBeTruthy();

    const callback = await request(app.getHttpServer())
      .get('/api/auth/gmail/callback')
      .query({ code: 'one-time-code', state })
      .expect(200);
    expect(callback.text).toContain('gmail-connected');
  };

  it('3. the user can start reconnecting without logging in again, and Gmail works afterwards', async () => {
    await reconnectGmail();
    expect(gmailWatchService.registerWatch).toHaveBeenCalledWith(3, 'me@gmail.com');

    await request(app.getHttpServer())
      .get('/api/auth/gmail/status')
      .set('Authorization', session)
      .expect(200, { gmailEmail: 'me@gmail.com' });

    await request(app.getHttpServer())
      .get('/api/probe/gmail-token')
      .set('Authorization', session)
      .expect(200, { token: 'fresh-access' });
  });

  it('4. a refresh that was already in flight with the old token cannot wipe a Gmail the user just reconnected', async () => {
    // A request starts refreshing with the old token...
    store = { ...NO_GMAIL, gmailAccessToken: 'old', gmailRefreshToken: 'old-refresh', gmailTokenExpiry: new Date(Date.now() - 60_000), gmailEmail: 'me@gmail.com' };
    let rejectRefresh!: (err: unknown) => void;
    const callsBefore = helper.gmailRefreshAccessToken.mock.calls.length;
    helper.gmailRefreshAccessToken.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRefresh = reject; }));
    const inFlight = request(app.getHttpServer()).get('/api/probe/gmail-token').set('Authorization', session).then((r) => r);
    for (let i = 0; i < 100 && helper.gmailRefreshAccessToken.mock.calls.length === callsBefore; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(helper.gmailRefreshAccessToken.mock.calls.length).toBe(callsBefore + 1);

    // ...the user reconnects in the meantime...
    await reconnectGmail();
    expect(store.gmailRefreshToken).toBe('fresh-refresh');

    // ...and only then does Google reject the old token.
    rejectRefresh(Object.assign(new Error('Request failed with status code 400'), {
      response: { status: 400, data: { error: 'invalid_grant' } },
    }));
    const res = await inFlight;

    expect(res.status).toBe(409);
    expect(store.gmailRefreshToken).toBe('fresh-refresh');
    expect(store.gmailEmail).toBe('me@gmail.com');
  });
});
