import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bodyParser from 'body-parser';
import * as request from 'supertest';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { GmailAuthController } from '../src/gmail/controllers/gmail-auth.controller';
import {
  GMAIL_RECONNECT_REQUIRED,
  GmailReconnectRequiredException,
} from '../src/gmail/exceptions/gmail-reconnect-required.exception';
import { GmailAuthService } from '../src/gmail/services/gmail-auth.service';
import { GmailProcessingService } from '../src/gmail/services/gmail-processing.service';
import { GmailWatchService } from '../src/gmail/services/gmail-watch.service';

/**
 * POST /api/auth/gmail/backfill: the opt-in catch-up of recent mail. It must
 * start work in the background and answer at once, refuse before starting
 * anything when Gmail isn't usable, and stay a non-401 on every Gmail failure
 * (the client logs the user out on any 401 from this API).
 */

const JWT_SECRET_KEY = 'gmail-backfill-test-secret';

describe('POST /api/auth/gmail/backfill', () => {
  let app: INestApplication;
  const authService = { getValidToken: jest.fn() };
  const processing = { tryStartBackfill: jest.fn() };

  const jwt = new JwtService({ secret: JWT_SECRET_KEY });
  const session = `Bearer ${jwt.sign({ userId: 3, email: 'me@example.com' })}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: JWT_SECRET_KEY })],
      controllers: [GmailAuthController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: (k: string) => ({ JWT_SECRET_KEY })[k] } },
        { provide: GmailAuthService, useValue: authService },
        { provide: GmailWatchService, useValue: {} },
        { provide: GmailProcessingService, useValue: processing },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(bodyParser.json());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    authService.getValidToken.mockReset().mockResolvedValue('access-token');
    processing.tryStartBackfill.mockReset().mockReturnValue(true);
  });

  it('needs a session, and starts nothing without one', async () => {
    await request(app.getHttpServer()).post('/api/auth/gmail/backfill').expect(401);

    expect(processing.tryStartBackfill).not.toHaveBeenCalled();
  });

  it('answers 202 at once and starts the backfill for the signed-in user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/gmail/backfill')
      .set('Authorization', session)
      .expect(202);

    expect(res.body).toEqual({ status: 'started' });
    expect(processing.tryStartBackfill).toHaveBeenCalledWith(3);
  });

  it('answers 409 GMAIL_RECONNECT_REQUIRED (never 401) and starts nothing when Gmail is not connected', async () => {
    authService.getValidToken.mockRejectedValue(new GmailReconnectRequiredException());

    const res = await request(app.getHttpServer())
      .post('/api/auth/gmail/backfill')
      .set('Authorization', session)
      .expect(409);

    expect(res.body.code).toBe(GMAIL_RECONNECT_REQUIRED);
    expect(processing.tryStartBackfill).not.toHaveBeenCalled();
  });

  it('answers 429 when this user ran a backfill recently', async () => {
    processing.tryStartBackfill.mockReturnValue(false);

    await request(app.getHttpServer())
      .post('/api/auth/gmail/backfill')
      .set('Authorization', session)
      .expect(429);
  });
});
