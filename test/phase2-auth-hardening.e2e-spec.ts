import { ForbiddenException, INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bodyParser from 'body-parser';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { EmailController } from '../src/emails/email.controller';
import { GmailWebhookController } from '../src/gmail/controllers/gmail-webhook.controller';
import { GmailAuthService } from '../src/gmail/services/gmail-auth.service';
import { JobSearchCriteriaController } from '../src/job-search-criteria/job-search-criteria.controller';
import { JobSearchController } from '../src/job-search/job-search.controller';
import { JobSearchService } from '../src/job-search/job-search.service';
import { JobSearchCriteriaService } from '../src/job-search-criteria/job-search-criteria.service';
import { EmailClassificationService } from '../src/emails/services/email-classification.service';
import { GmailProcessingService } from '../src/gmail/services/gmail-processing.service';
import { HelperService } from '../src/services/helper.service';
import { UsersController } from '../src/users/users.controller';
import { UserService } from '../src/users/users.service';

const JWT_SECRET_KEY = 'phase2-test-secret';
const configServiceStub = {
  get: (key: string) => (key === 'JWT_SECRET_KEY' ? JWT_SECRET_KEY : undefined),
};

async function buildApp(controllers: any[], providers: any[]): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule, JwtModule.register({ secret: JWT_SECRET_KEY })],
    controllers,
    providers: [
      JwtStrategy,
      { provide: ConfigService, useValue: configServiceStub },
      ...providers,
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.use(bodyParser.json());
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

function tokenFor(userId: number, email = `user${userId}@example.com`): string {
  const jwt = new JwtService({ secret: JWT_SECRET_KEY });
  return jwt.sign({ userId, email });
}

describe('Phase 2: guards use the JWT only, never query/body', () => {
  describe('JobSearchController (/api/jobsearch)', () => {
    let app: INestApplication;
    const jobSearchService = {
      getApplications: jest.fn().mockResolvedValue([{ jobId: 1 }]),
      addNewApplication: jest.fn().mockResolvedValue(undefined),
      updateApplication: jest.fn().mockResolvedValue(undefined),
      removeApplicationRows: jest.fn().mockResolvedValue([]),
    };

    beforeAll(async () => {
      app = await buildApp([JobSearchController], [
        { provide: JobSearchService, useValue: jobSearchService },
      ]);
    });
    afterAll(() => app.close());
    beforeEach(() => jest.clearAllMocks());

    it('rejects GET /jobsearch/data with no token', async () => {
      await request(app.getHttpServer()).get('/api/jobsearch/data').expect(401);
    });

    it('ignores a forged user_id query param and uses the JWT instead', async () => {
      const token = tokenFor(7);
      await request(app.getHttpServer())
        .get('/api/jobsearch/data?user_id=9999')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(jobSearchService.getApplications).toHaveBeenCalledWith(7);
    });

    it('ignores a forged userId in the body on add/update', async () => {
      const token = tokenFor(7);
      await request(app.getHttpServer())
        .post('/api/jobsearch/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 9999, status: 'applied', companyName: 'Acme' })
        .expect(201);
      expect(jobSearchService.addNewApplication).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7 }),
      );

      await request(app.getHttpServer())
        .post('/api/jobsearch/update')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 9999, jobId: 1 })
        .expect(201);
      expect(jobSearchService.updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7 }),
      );
    });

    it('removemultiple scopes every row to the JWT userId, not the body', async () => {
      const token = tokenFor(7);
      await request(app.getHttpServer())
        .post('/api/jobsearch/removemultiple')
        .set('Authorization', `Bearer ${token}`)
        .send({ 0: { jobId: 1, userId: 9999 } })
        .expect(201);
      expect(jobSearchService.removeApplicationRows).toHaveBeenCalledWith([
        expect.objectContaining({ jobId: 1, userId: 7 }),
      ]);
    });
  });

  describe('JobSearchCriteriaController (/api/jobsearchcriteria)', () => {
    let app: INestApplication;
    const criteriaService = { getJobCriteriaData: jest.fn().mockResolvedValue([{ criteriaId: 1 }]) };

    beforeAll(async () => {
      app = await buildApp([JobSearchCriteriaController], [
        { provide: JobSearchCriteriaService, useValue: criteriaService },
      ]);
    });
    afterAll(() => app.close());

    it('rejects with no token', async () => {
      await request(app.getHttpServer()).get('/api/jobsearchcriteria/criteria').expect(401);
    });

    it('scopes the query to the JWT userId (route used to have no where-clause at all)', async () => {
      const token = tokenFor(42);
      await request(app.getHttpServer())
        .get('/api/jobsearchcriteria/criteria')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(criteriaService.getJobCriteriaData).toHaveBeenCalledWith(42);
    });
  });

  describe('UsersController (/api/users)', () => {
    let app: INestApplication;
    const usersService = {
      findOneByEmail: jest.fn().mockResolvedValue({ userId: 7, email: 'user7@example.com' }),
      findOneById: jest.fn().mockResolvedValue({ userId: 7, email: 'user7@example.com' }),
      createUser: jest.fn().mockResolvedValue({ userId: 1 }),
    };

    beforeAll(async () => {
      app = await buildApp([UsersController], [
        { provide: UserService, useValue: usersService },
      ]);
    });
    afterAll(() => app.close());

    it('GET /users/user: 401 with no token, otherwise ignores any identity and uses the JWT email', async () => {
      await request(app.getHttpServer()).get('/api/users/user').expect(401);
      const token = tokenFor(7, 'user7@example.com');
      await request(app.getHttpServer())
        .get('/api/users/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(usersService.findOneByEmail).toHaveBeenCalledWith('user7@example.com');
    });

    it('GET /users/:id: 403 when the id does not match the caller, 200 when it does', async () => {
      const token = tokenFor(7);
      await request(app.getHttpServer())
        .get('/api/users/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      await request(app.getHttpServer())
        .get('/api/users/7')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('GET /users/all no longer exists as its own route (falls through to the guarded :id route and is rejected, never reaching a handler)', async () => {
      // No @Get('all') route anymore, so 'all' is matched by @Get(':id') —
      // which is guarded, so an unauthenticated request is stopped at 401
      // before ParseIntPipe would even reject 'all' as non-numeric. Either
      // way, nothing is returned.
      await request(app.getHttpServer()).get('/api/users/all').expect(401);
    });

    it('POST /users/add stays public (registration)', async () => {
      await request(app.getHttpServer())
        .post('/api/users/add')
        .send({ email: 'new@example.com', firstName: 'A', lastName: 'B', password: 'secret1' })
        .expect(201);
    });
  });

  describe('EmailController (/api/emails/classify)', () => {
    let app: INestApplication;
    const classificationService = { classify: jest.fn().mockResolvedValue({ intent: 'UNKNOWN' }) };

    beforeAll(async () => {
      app = await buildApp([EmailController], [
        { provide: EmailClassificationService, useValue: classificationService },
      ]);
    });
    afterAll(() => app.close());

    it('rejects an unauthenticated classify call (closes the cost-abuse hole)', async () => {
      await request(app.getHttpServer())
        .post('/api/emails/classify')
        .send({ subject: 'x', bodyText: 'y', sender: 'a@b.com' })
        .expect(401);
    });

    it('allows it once authenticated', async () => {
      const token = tokenFor(1);
      await request(app.getHttpServer())
        .post('/api/emails/classify')
        .set('Authorization', `Bearer ${token}`)
        .send({ subject: 'x', bodyText: 'y', sender: 'a@b.com' })
        .expect(201);
    });
  });

  describe('AuthController (/api/auth) — signtoken no longer mints on an unverified body', () => {
    let app: INestApplication;
    const authService = {
      validateUser: jest.fn(),
      tokenGenerator: jest.fn((u: { userId: number; email: string }) =>
        Promise.resolve({ userId: u.userId, email: u.email, auth_token: 'signed' }),
      ),
      tokenVerification: jest.fn(),
    };
    const helperService = new HelperService(undefined as any);

    beforeAll(async () => {
      app = await buildApp([AuthController], [
        { provide: AuthService, useValue: authService },
        { provide: HelperService, useValue: helperService },
      ]);
    });
    afterAll(() => app.close());
    beforeEach(() => jest.clearAllMocks());

    it('signtoken rejects credentials that do not validate — no more "mint a token for any body"', async () => {
      authService.validateUser.mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      await request(app.getHttpServer())
        .post('/api/auth/signtoken')
        .send({ email: 'victim@example.com', password: 'guessed-wrong', userId: 42 })
        .expect(401);
      expect(authService.tokenGenerator).not.toHaveBeenCalled();
    });

    it('signtoken mints a token from the VALIDATED user, ignoring a userId supplied in the body', async () => {
      authService.validateUser.mockResolvedValue({ userId: 7, email: 'real@example.com' });
      const res = await request(app.getHttpServer())
        .post('/api/auth/signtoken')
        .send({ email: 'real@example.com', password: 'correct', userId: 42 })
        .expect(201);
      expect(authService.tokenGenerator).toHaveBeenCalledWith({ userId: 7, email: 'real@example.com' });
      expect(res.body.userId).toBe(7);
    });

    it('login still works with plain credentials (no Authorization header)', async () => {
      authService.validateUser.mockResolvedValue({ userId: 7, email: 'real@example.com' });
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'real@example.com', password: 'correct' })
        .expect(201);
      expect(authService.validateUser).toHaveBeenCalledWith('real@example.com', 'correct');
    });

    it('login with a valid existing token refreshes it without re-checking a password', async () => {
      authService.tokenVerification.mockResolvedValue({ userId: 7, email: 'real@example.com' });
      const token = tokenFor(7, 'real@example.com');
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(201);
      expect(authService.validateUser).not.toHaveBeenCalled();
    });

    it('verify is still guarded', async () => {
      await request(app.getHttpServer()).get('/api/auth/verify').expect(401);
    });
  });

  describe('Gmail OAuth state signing (replaces a raw, unsigned userId)', () => {
    const jwtService = new JwtService({ secret: JWT_SECRET_KEY });
    const gmailAuthService = new GmailAuthService(
      configServiceStub as any,
      undefined as any,
      undefined as any,
      undefined as any,
      jwtService,
    );

    it('getAuthUrl embeds a signed state, not a bare userId', () => {
      const url = gmailAuthService.getAuthUrl(42);
      const state = new URL(url).searchParams.get('state')!;
      expect(state).not.toBe('42');
      expect(() => jwtService.verify(state)).not.toThrow();
    });

    it('verifyStateToken recovers the original userId for a state it issued', () => {
      const url = gmailAuthService.getAuthUrl(42);
      const state = new URL(url).searchParams.get('state')!;
      expect(gmailAuthService.verifyStateToken(state)).toBe(42);
    });

    it('verifyStateToken rejects a state that was not signed by us (e.g. a bare forged userId)', () => {
      expect(() => gmailAuthService.verifyStateToken('999')).toThrow(UnauthorizedException);
    });

    it('verifyStateToken rejects a token signed with the wrong secret', () => {
      const otherJwt = new JwtService({ secret: 'not-the-real-secret' });
      const forged = otherJwt.sign({ userId: 999, purpose: 'gmail-oauth-state' });
      expect(() => gmailAuthService.verifyStateToken(forged)).toThrow(UnauthorizedException);
    });
  });

  describe('GmailWebhookController token check', () => {
    let app: INestApplication;
    const processingService = { processNotification: jest.fn().mockResolvedValue(undefined) };
    const realToken = 'a-long-random-webhook-secret';

    beforeAll(async () => {
      app = await buildApp([GmailWebhookController], [
        {
          // Must still answer JWT_SECRET_KEY too — JwtStrategy is wired up
          // in every test app by buildApp(), and a provider here overrides
          // the base ConfigService stub for the whole module, not just for
          // this controller's own constructor.
          provide: ConfigService,
          useValue: {
            get: (k: string) => (k === 'PUBSUB_WEBHOOK_TOKEN' ? realToken : configServiceStub.get(k)),
          },
        },
        { provide: GmailProcessingService, useValue: processingService },
      ]);
    });
    afterAll(() => app.close());

    const body = { message: { data: Buffer.from('{}').toString('base64'), messageId: '1', publishTime: 'now' }, subscription: 's' };

    it('rejects the wrong token', async () => {
      await request(app.getHttpServer())
        .post('/api/gmail/webhook?token=wrong')
        .send(body)
        .expect(401);
    });

    it('accepts the right token', async () => {
      await request(app.getHttpServer())
        .post(`/api/gmail/webhook?token=${realToken}`)
        .send(body)
        .expect(200);
    });
  });
});
