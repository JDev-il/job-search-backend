import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { GmailReconnectRequiredException } from '../exceptions/gmail-reconnect-required.exception';
import { GmailCatchUpService } from './gmail-catch-up.service';

describe('GmailCatchUpService', () => {
  const user = (over: Record<string, unknown> = {}) => ({ userId: 3, gmailEmail: 'me@gmail.com', gmailHistoryId: '200', ...over });

  const build = (users: any[], currentIds: Record<number, string | Error> = {}) => {
    const userService = { findUsersWithGmail: jest.fn().mockResolvedValue(users) };
    const gmailApiService = {
      getCurrentHistoryId: jest.fn().mockImplementation(async (userId: number) => {
        const v = currentIds[userId] ?? '200';
        if (v instanceof Error) throw v;
        return v;
      }),
    };
    const processingService = { processNotification: jest.fn().mockResolvedValue(undefined) };
    const service = new GmailCatchUpService(userService as any, gmailApiService as any, processingService as any);
    const logger = {
      log: jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined),
      warn: jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined),
      error: jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined),
    };
    return { service, userService, gmailApiService, processingService, logger };
  };

  it('is scheduled every 15 minutes', () => {
    const options = Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, GmailCatchUpService.prototype.catchUpAll);
    expect(options.cronTime).toBe('*/15 * * * *');
  });

  it('runs a queue-only pass up to the mailbox\'s current history id when it has moved past the cursor', async () => {
    const { service, processingService } = build([user()], { 3: '250' });

    await service.catchUpAll();

    expect(processingService.processNotification).toHaveBeenCalledWith('me@gmail.com', '250', { queueOnly: true });
  });

  it('does nothing for a mailbox that has not moved since the cursor (no history read at all)', async () => {
    const { service, processingService } = build([user()], { 3: '200' });

    await service.catchUpAll();

    expect(processingService.processNotification).not.toHaveBeenCalled();
  });

  it('skips a user who has no cursor yet, without calling Gmail: there is nothing to catch up from', async () => {
    const { service, gmailApiService, processingService } = build([user({ gmailHistoryId: null }), user({ userId: 4, gmailEmail: null })]);

    await service.catchUpAll();

    expect(gmailApiService.getCurrentHistoryId).not.toHaveBeenCalled();
    expect(processingService.processNotification).not.toHaveBeenCalled();
  });

  it('keeps going when one user fails, so one bad mailbox cannot starve the others', async () => {
    const { service, processingService, logger } = build(
      [user({ userId: 3, gmailEmail: 'a@gmail.com' }), user({ userId: 4, gmailEmail: 'b@gmail.com' })],
      { 3: new Error('socket hang up'), 4: '250' },
    );

    await expect(service.catchUpAll()).resolves.toBeUndefined();

    expect(processingService.processNotification).toHaveBeenCalledTimes(1);
    expect(processingService.processNotification).toHaveBeenCalledWith('b@gmail.com', '250', { queueOnly: true });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('socket hang up'));
  });

  it('treats a user who must reconnect Gmail as expected, not as an error', async () => {
    const { service, logger } = build([user()], { 3: new GmailReconnectRequiredException() });

    await service.catchUpAll();

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/reconnect/i));
  });

  it('says a rate limit will be retried on the next run, without calling it an error', async () => {
    const { service, logger } = build([user()], { 3: Object.assign(new Error('status 429'), { response: { status: 429 } }) });

    await service.catchUpAll();

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/rate limited/i));
  });

  it('never lets a failure while listing users escape the scheduled job, and runs again next tick', async () => {
    const { service, userService, logger } = build([user()]);
    userService.findUsersWithGmail.mockRejectedValueOnce(new Error('db down'));

    await expect(service.catchUpAll()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('db down'));

    await service.catchUpAll();
    expect(userService.findUsersWithGmail).toHaveBeenCalledTimes(2);
  });

  it('does not log anything from the axios error config (it carries the bearer token)', async () => {
    const err = Object.assign(new Error('Request failed with status code 500'), {
      response: { status: 500 },
      config: { headers: { Authorization: 'Bearer secret-token' } },
    });
    const { service, logger } = build([user()], { 3: err });

    await service.catchUpAll();

    expect(JSON.stringify(logger.error.mock.calls)).toContain('500');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret-token');
  });

  it('skips a tick that fires while the previous one is still running', async () => {
    const { service, userService, processingService } = build([user()], { 3: '250' });
    let release!: () => void;
    processingService.processNotification.mockReturnValueOnce(new Promise<void>((r) => { release = r; }));

    const first = service.catchUpAll();
    await new Promise((r) => setImmediate(r));
    await service.catchUpAll(); // overlapping tick: returns at once
    expect(userService.findUsersWithGmail).toHaveBeenCalledTimes(1);

    release();
    await first;
    await service.catchUpAll(); // and the next tick runs normally again
    expect(userService.findUsersWithGmail).toHaveBeenCalledTimes(2);
  });
});
