import { ApplicationStatus } from '../../applications/enums/application-status.enum';
import { GmailHistoryExpiredException } from '../exceptions/gmail-history-expired.exception';
import { GmailProcessingService } from './gmail-processing.service';

describe('GmailProcessingService.processNotification', () => {
  const SUBJECT = 'Your interview with Acme';
  const BODY = 'Hi Jonathan, we would like to invite you to a final round on Tuesday.';

  it('never writes an email subject or body to the logs', async () => {
    const userService = {
      findByGmailEmail: jest.fn().mockResolvedValue({ userId: 3, gmailHistoryId: '100' }),
      updateGmailHistoryId: jest.fn().mockResolvedValue(undefined),
    };
    const gmailApiService = {
      getNewMessageIds: jest.fn().mockResolvedValue(['m1']),
      fetchMessage: jest.fn().mockResolvedValue({
        messageId: 'm1',
        threadId: 't1',
        subject: SUBJECT,
        bodyText: BODY,
        senderDomain: 'acme.com',
      }),
    };
    const classificationService = {
      classify: jest.fn().mockResolvedValue({ intent: 'unknown', confidence: 0.1, source: 'rules' }),
    };
    const service = new GmailProcessingService(
      userService as any,
      gmailApiService as any,
      classificationService as any,
      {} as any,
      {} as any,
    );

    const logged: string[] = [];
    for (const level of ['log', 'debug', 'verbose', 'warn', 'error'] as const) {
      jest.spyOn((service as any).logger, level).mockImplementation((msg: unknown) => {
        logged.push(String(msg));
      });
    }

    await service.processNotification('me@gmail.com', '200');

    expect(classificationService.classify).toHaveBeenCalledTimes(1); // the message really went through
    expect(logged.length).toBeGreaterThan(0);
    for (const line of logged) {
      expect(line).not.toContain(SUBJECT);
      expect(line).not.toContain('final round');
    }
    expect(userService.updateGmailHistoryId).toHaveBeenCalledWith(3, '200');
  });
});

describe('GmailProcessingService.processNotification: stale history cursor', () => {
  const build = (getNewMessageIds: jest.Mock) => {
    const userService = {
      findByGmailEmail: jest.fn().mockResolvedValue({ userId: 3, gmailHistoryId: '100' }),
      updateGmailHistoryId: jest.fn().mockResolvedValue(undefined),
    };
    const gmailApiService = { getNewMessageIds, fetchMessage: jest.fn() };
    const service = new GmailProcessingService(
      userService as any,
      gmailApiService as any,
      { classify: jest.fn() } as any,
      {} as any,
      {} as any,
    );
    const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    return { service, userService, gmailApiService, warn };
  };

  it('restarts from the notification instead of failing every later push when Gmail has dropped the history', async () => {
    const { service, userService, gmailApiService, warn } = build(
      jest.fn().mockRejectedValue(new GmailHistoryExpiredException()),
    );

    await expect(service.processNotification('me@gmail.com', '900')).resolves.toBeUndefined();

    expect(userService.updateGmailHistoryId).toHaveBeenCalledWith(3, '900');
    expect(gmailApiService.fetchMessage).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('expired'));
  });

  it('keeps the cursor and rethrows on any other failure, so the range is retried on the next push', async () => {
    const boom = new Error('socket hang up');
    const { service, userService } = build(jest.fn().mockRejectedValue(boom));

    await expect(service.processNotification('me@gmail.com', '900')).rejects.toBe(boom);

    expect(userService.updateGmailHistoryId).not.toHaveBeenCalled();
  });
});

describe('GmailProcessingService.processNotification: overlapping notifications', () => {
  /** getNewMessageIds that stays pending until released, so a pass can be held "in flight". */
  const gate = () => {
    let release!: () => void;
    const promise = new Promise<string[]>((resolve) => { release = () => resolve([]); });
    return { promise, release };
  };

  const build = (getNewMessageIds: jest.Mock) => {
    const userService = {
      findByGmailEmail: jest.fn().mockImplementation(async (email: string) => ({ userId: email === 'a@gmail.com' ? 1 : 2, gmailHistoryId: '100' })),
      updateGmailHistoryId: jest.fn().mockResolvedValue(undefined),
    };
    const service = new GmailProcessingService(
      userService as any,
      { getNewMessageIds, fetchMessage: jest.fn() } as any,
      { classify: jest.fn() } as any,
      {} as any,
      {} as any,
    );
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    return { service, userService };
  };

  it('folds a burst of notifications for one mailbox into a single follow-up pass instead of re-reading the same range for each', async () => {
    const first = gate();
    const getNewMessageIds = jest.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue([]);
    const { service, userService } = build(getNewMessageIds);

    const running = service.processNotification('a@gmail.com', '200');
    await Promise.resolve();
    await service.processNotification('a@gmail.com', '300'); // returns at once, a pass is running
    await service.processNotification('a@gmail.com', '400');
    expect(getNewMessageIds).toHaveBeenCalledTimes(1);

    first.release();
    await running;

    expect(getNewMessageIds).toHaveBeenCalledTimes(2); // not 3
    expect(userService.updateGmailHistoryId).toHaveBeenLastCalledWith(1, '400'); // the follow-up carried the latest id
  });

  it('does not make one mailbox wait for another', async () => {
    const first = gate();
    const getNewMessageIds = jest.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue([]);
    const { service, userService } = build(getNewMessageIds);

    const running = service.processNotification('a@gmail.com', '200');
    await Promise.resolve();
    await service.processNotification('b@gmail.com', '250'); // different mailbox: runs now

    expect(getNewMessageIds).toHaveBeenCalledTimes(2);
    expect(userService.updateGmailHistoryId).toHaveBeenCalledWith(2, '250');

    first.release();
    await running;
  });

  it('lets the next notification run after a failed pass', async () => {
    const getNewMessageIds = jest.fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValue([]);
    const { service, userService } = build(getNewMessageIds);

    await expect(service.processNotification('a@gmail.com', '200')).rejects.toThrow('socket hang up');
    await service.processNotification('a@gmail.com', '300');

    expect(userService.updateGmailHistoryId).toHaveBeenCalledWith(1, '300');
  });
});

describe('GmailProcessingService: message handling policy', () => {
  const email = (id: string, over: Record<string, unknown> = {}) => ({
    messageId: id, threadId: `t-${id}`, subject: 's', bodyText: 'b', senderDomain: 'acme.com', ...over,
  });
  const http = (status: number, data?: unknown) =>
    Object.assign(new Error(`status ${status}`), { response: { status, data }, config: { url: 'https://gmail/x' } });
  const rules = (suggestedStatus = 'Rejected') => ({ intent: 'rejection', confidence: 0.9, source: 'rules', suggestedStatus });
  const llm = (suggestedStatus = 'Rejected') => ({ intent: 'rejection', confidence: 0.6, source: 'llm', suggestedStatus });

  const build = (over: { ids?: string[]; fetchMessage?: jest.Mock; classify?: jest.Mock; linked?: any; existing?: any } = {}) => {
    const userService = {
      findByGmailEmail: jest.fn().mockResolvedValue({ userId: 3, gmailHistoryId: '100' }),
      updateGmailHistoryId: jest.fn().mockResolvedValue(undefined),
    };
    const gmailApiService = {
      getNewMessageIds: jest.fn().mockResolvedValue(over.ids ?? ['m1']),
      fetchMessage: over.fetchMessage ?? jest.fn().mockImplementation(async (_u: number, id: string) => email(id)),
      listRecentMessageIds: jest.fn().mockResolvedValue(over.ids ?? ['m1']),
    };
    const classificationService = { classify: over.classify ?? jest.fn().mockResolvedValue(rules()) };
    const jobSearchService = {
      findByThreadId: jest.fn().mockResolvedValue(over.linked ?? null),
      findMatchingApplication: jest.fn().mockResolvedValue(over.existing ?? null),
      setStatus: jest.fn().mockResolvedValue(undefined),
    };
    const pendingActionsService = { create: jest.fn().mockResolvedValue({}) };
    const service = new GmailProcessingService(
      userService as any, gmailApiService as any, classificationService as any, jobSearchService as any, pendingActionsService as any,
    );
    for (const level of ['log', 'debug', 'warn', 'error'] as const) {
      jest.spyOn((service as any).logger, level).mockImplementation(() => undefined);
    }
    return { service, userService, gmailApiService, classificationService, jobSearchService, pendingActionsService };
  };

  describe('failures', () => {
    it('stops and keeps the cursor when Gmail rate-limits mid-batch, instead of dropping the remaining messages one by one', async () => {
      const fetchMessage = jest.fn()
        .mockResolvedValueOnce(email('m1'))
        .mockRejectedValueOnce(http(429));
      const { service, userService, classificationService } = build({ ids: ['m1', 'm2', 'm3'], fetchMessage });

      await expect(service.processNotification('me@gmail.com', '200')).rejects.toMatchObject({ response: { status: 429 } });

      expect(fetchMessage).toHaveBeenCalledTimes(2); // m3 was never attempted
      expect(classificationService.classify).toHaveBeenCalledTimes(1);
      expect(userService.updateGmailHistoryId).not.toHaveBeenCalled();
    });

    it('treats a rate-limited classifier call the same way', async () => {
      const { service, userService } = build({ classify: jest.fn().mockRejectedValue(http(429)) });

      await expect(service.processNotification('me@gmail.com', '200')).rejects.toMatchObject({ response: { status: 429 } });

      expect(userService.updateGmailHistoryId).not.toHaveBeenCalled();
    });

    it('skips a message that fails for its own reasons and carries on, so one bad message cannot block the mailbox', async () => {
      const fetchMessage = jest.fn()
        .mockRejectedValueOnce(http(500))
        .mockResolvedValueOnce(email('m2'));
      const { service, userService, classificationService } = build({ ids: ['m1', 'm2'], fetchMessage });

      await service.processNotification('me@gmail.com', '200');

      expect(classificationService.classify).toHaveBeenCalledTimes(1); // m2
      expect(userService.updateGmailHistoryId).toHaveBeenCalledWith(3, '200');
    });

    it('says plainly in the log when a message is skipped', async () => {
      const { service } = build({ fetchMessage: jest.fn().mockRejectedValue(http(404)) });
      const error = jest.spyOn((service as any).logger, 'error');

      await service.processNotification('me@gmail.com', '200');

      expect(error).toHaveBeenCalledWith(expect.stringMatching(/m1.*skipped/s));
    });
  });

  describe('automatic changes', () => {
    const linked = (status: string) => ({ jobId: 9, companyName: 'Acme', status });

    it.each([
      ApplicationStatus.REJECTED,
      ApplicationStatus.CONTRACT_ACCEPTED,
      ApplicationStatus.ARCHIVED,
      ApplicationStatus.PASSED,
    ])('never touches an application the user has closed (%s)', async (status) => {
      const { service, jobSearchService, pendingActionsService } = build({
        linked: linked(status),
        classify: jest.fn().mockResolvedValue(rules(ApplicationStatus.AWAITING_RESPONSE)),
      });

      await service.processNotification('me@gmail.com', '200');

      expect(jobSearchService.setStatus).not.toHaveBeenCalled();
      expect(pendingActionsService.create).not.toHaveBeenCalled();
    });

    it('does nothing when the application already has the suggested status', async () => {
      const { service, jobSearchService, pendingActionsService } = build({
        linked: linked(ApplicationStatus.AWAITING_RESPONSE),
        classify: jest.fn().mockResolvedValue(llm(ApplicationStatus.AWAITING_RESPONSE)),
      });

      await service.processNotification('me@gmail.com', '200');

      expect(jobSearchService.setStatus).not.toHaveBeenCalled();
      expect(pendingActionsService.create).not.toHaveBeenCalled();
    });

    it('still auto-applies a clear rules match on an open application (unchanged behaviour)', async () => {
      const { service, jobSearchService, pendingActionsService } = build({
        linked: linked(ApplicationStatus.AWAITING_RESPONSE),
        classify: jest.fn().mockResolvedValue(rules(ApplicationStatus.REJECTED)),
      });

      await service.processNotification('me@gmail.com', '200');

      expect(jobSearchService.setStatus).toHaveBeenCalledWith(3, 9, ApplicationStatus.REJECTED);
      expect(pendingActionsService.create).not.toHaveBeenCalled();
    });
  });

  describe('stale pass', () => {
    it('lets a new notification take over a pass stuck for too long, and the stuck pass cannot release the new pass\'s lock', async () => {
      const gate = () => { let release!: () => void; const promise = new Promise<string[]>((r) => { release = () => r([]); }); return { promise, release }; };
      const stuck = gate();
      const second = gate();
      const { service, gmailApiService } = build();
      gmailApiService.getNewMessageIds
        .mockReturnValueOnce(stuck.promise)
        .mockReturnValueOnce(second.promise)
        .mockResolvedValue([]);
      const now = jest.spyOn(Date, 'now');
      now.mockReturnValue(1_000_000);

      const firstPass = service.processNotification('me@gmail.com', '200');
      await Promise.resolve();
      now.mockReturnValue(1_000_000 + 21 * 60_000);
      const takeover = service.processNotification('me@gmail.com', '300'); // would queue forever without takeover
      await Promise.resolve();
      expect(gmailApiService.getNewMessageIds).toHaveBeenCalledTimes(2);

      stuck.release(); // the old pass finally ends...
      await firstPass;
      await service.processNotification('me@gmail.com', '400'); // ...but the takeover pass still owns the mailbox, so this queues
      expect(gmailApiService.getNewMessageIds).toHaveBeenCalledTimes(2);

      second.release();
      await takeover;
      expect(gmailApiService.getNewMessageIds).toHaveBeenCalledTimes(3); // the queued 400 ran as the follow-up
      now.mockRestore();
    });
  });

  describe('backfill', () => {
    it('replays the recent mail oldest-first and only ever queues proposals, never edits the table', async () => {
      const { service, jobSearchService, pendingActionsService, gmailApiService } = build({
        ids: ['old', 'new'],
        linked: { jobId: 9, companyName: 'Acme', status: ApplicationStatus.AWAITING_RESPONSE },
        classify: jest.fn().mockResolvedValue(rules(ApplicationStatus.REJECTED)), // a rules match: live, this would auto-apply
      });

      await service.backfillRecent(3);

      expect(gmailApiService.listRecentMessageIds).toHaveBeenCalledWith(3, 7, 50);
      expect(gmailApiService.fetchMessage.mock.calls.map(([, id]: [number, string]) => id)).toEqual(['old', 'new']);
      expect(jobSearchService.setStatus).not.toHaveBeenCalled();
      expect(pendingActionsService.create).toHaveBeenCalledTimes(2);
    });

    it('also queues, rather than applies, when the mail matches an application by company name', async () => {
      const open = { jobId: 9, companyName: 'Acme', status: ApplicationStatus.AWAITING_RESPONSE };
      const { service, jobSearchService, pendingActionsService } = build({
        existing: open, // no linked thread: this goes through findMatchingApplication
        classify: jest.fn().mockResolvedValue(rules(ApplicationStatus.REJECTED)),
      });

      await service.backfillRecent(3);

      expect(jobSearchService.setStatus).not.toHaveBeenCalled();
      expect(pendingActionsService.create).toHaveBeenCalledTimes(1);
    });

    it('control: the same company-name match from live mail still auto-applies', async () => {
      const open = { jobId: 9, companyName: 'Acme', status: ApplicationStatus.AWAITING_RESPONSE };
      const { service, jobSearchService, pendingActionsService } = build({
        existing: open,
        classify: jest.fn().mockResolvedValue(rules(ApplicationStatus.REJECTED)),
      });

      await service.processNotification('me@gmail.com', '200');

      expect(jobSearchService.setStatus).toHaveBeenCalledWith(3, 9, ApplicationStatus.REJECTED);
      expect(pendingActionsService.create).not.toHaveBeenCalled();
    });

    it('allows one backfill per user per cooldown window', () => {
      const { service } = build();
      jest.spyOn(service, 'backfillRecent').mockResolvedValue(undefined);
      const now = jest.spyOn(Date, 'now');

      now.mockReturnValue(5_000_000);
      expect(service.tryStartBackfill(3)).toBe(true);
      now.mockReturnValue(5_000_000 + 60_000);
      expect(service.tryStartBackfill(3)).toBe(false); // too soon
      expect(service.tryStartBackfill(4)).toBe(true); // another user is unaffected
      now.mockReturnValue(5_000_000 + 16 * 60_000);
      expect(service.tryStartBackfill(3)).toBe(true);
      now.mockRestore();
    });
  });
});
