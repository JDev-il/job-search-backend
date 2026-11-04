import { of, throwError } from 'rxjs';
import { GmailHistoryExpiredException } from '../exceptions/gmail-history-expired.exception';
import { GmailApiService } from './gmail-api.service';

const added = (...ids: string[]) => ids.map((id) => ({ message: { id, threadId: `t-${id}` } }));

describe('GmailApiService.getNewMessageIds', () => {
  let httpService: { get: jest.Mock };
  let service: GmailApiService;

  beforeEach(() => {
    httpService = { get: jest.fn() };
    service = new GmailApiService(
      httpService as any,
      { getValidToken: jest.fn().mockResolvedValue('access-token') } as any,
    );
    jest.spyOn((service as any).logger, 'debug').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    (service as any).backoff.sleep = jest.fn().mockResolvedValue(undefined); // never really wait in tests
  });

  it('follows nextPageToken so a long history is not truncated', async () => {
    httpService.get
      .mockReturnValueOnce(of({ data: { historyId: '9', nextPageToken: 'p2', history: [{ id: '1', messagesAdded: added('a', 'b') }] } }))
      .mockReturnValueOnce(of({ data: { historyId: '9', history: [{ id: '2', messagesAdded: added('c') }] } }));

    await expect(service.getNewMessageIds(3, '100')).resolves.toEqual(['a', 'b', 'c']);

    expect(httpService.get).toHaveBeenCalledTimes(2);
    expect(httpService.get.mock.calls[0][1].params).toEqual({ startHistoryId: '100', historyTypes: 'messageAdded' });
    expect(httpService.get.mock.calls[1][1].params).toEqual({ startHistoryId: '100', historyTypes: 'messageAdded', pageToken: 'p2' });
  });

  it('returns each message once even if history lists it twice', async () => {
    httpService.get.mockReturnValue(
      of({ data: { historyId: '9', history: [{ id: '1', messagesAdded: added('a') }, { id: '2', messagesAdded: added('a', 'b') }] } }),
    );

    await expect(service.getNewMessageIds(3, '100')).resolves.toEqual(['a', 'b']);
  });

  it('returns an empty list when nothing changed (Gmail omits "history")', async () => {
    httpService.get.mockReturnValue(of({ data: { historyId: '100' } }));

    await expect(service.getNewMessageIds(3, '100')).resolves.toEqual([]);
  });

  it('raises GmailHistoryExpiredException when Gmail no longer has history for the cursor (404)', async () => {
    httpService.get.mockReturnValue(throwError(() => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } })));

    await expect(service.getNewMessageIds(3, '100')).rejects.toBeInstanceOf(GmailHistoryExpiredException);
  });

  it('lets any other failure through untouched (it is not proof the cursor is stale)', async () => {
    const boom = Object.assign(new Error('Request failed with status code 400'), { response: { status: 400 } });
    httpService.get.mockReturnValue(throwError(() => boom));

    await expect(service.getNewMessageIds(3, '100')).rejects.toBe(boom);
    expect(httpService.get).toHaveBeenCalledTimes(1); // not transient, so not retried
  });

  it('after retries run out on a transient failure, rethrows it as is (so the caller keeps the cursor)', async () => {
    const boom = Object.assign(new Error('Request failed with status code 503'), { response: { status: 503 } });
    httpService.get.mockReturnValue(throwError(() => boom));

    await expect(service.getNewMessageIds(3, '100')).rejects.toBe(boom);
    expect(httpService.get).toHaveBeenCalledTimes(5);
  });

  describe('resilience', () => {
    const http = (status: number) => Object.assign(new Error(`status ${status}`), { response: { status } });

    beforeEach(() => {
      (service as any).backoff.sleep = jest.fn().mockResolvedValue(undefined);
      jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    });

    it('puts a timeout on every Gmail request so a stalled call cannot hang a pass forever', async () => {
      httpService.get.mockReturnValue(of({ data: { historyId: '9' } }));

      await service.getNewMessageIds(3, '100');

      expect(httpService.get.mock.calls[0][1].timeout).toBe(30_000);
    });

    it('retries a transient history failure instead of dropping the notification', async () => {
      httpService.get
        .mockReturnValueOnce(throwError(() => http(503)))
        .mockReturnValueOnce(of({ data: { historyId: '9', history: [{ id: '1', messagesAdded: added('a') }] } }));

      await expect(service.getNewMessageIds(3, '100')).resolves.toEqual(['a']);

      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('retries a rate-limited message fetch, then returns the parsed message', async () => {
      const detail = { id: 'm1', threadId: 't1', snippet: 's', payload: { headers: [{ name: 'Subject', value: 'Hi' }, { name: 'From', value: 'A <a@acme.com>' }] } };
      httpService.get
        .mockReturnValueOnce(throwError(() => http(429)))
        .mockReturnValueOnce(of({ data: detail }));

      await expect(service.fetchMessage(3, 'm1')).resolves.toMatchObject({ messageId: 'm1', senderDomain: 'acme.com' });

      expect(httpService.get).toHaveBeenCalledTimes(2);
      expect(httpService.get.mock.calls[0][1].timeout).toBe(30_000);
    });

    it('does not retry a message that is gone (404) and does not log the bearer token on a retry', async () => {
      httpService.get.mockReturnValue(throwError(() => http(404)));

      await expect(service.fetchMessage(3, 'm1')).rejects.toMatchObject({ response: { status: 404 } });
      expect(httpService.get).toHaveBeenCalledTimes(1);

      httpService.get.mockReset();
      httpService.get
        .mockReturnValueOnce(throwError(() => Object.assign(http(503), { config: { headers: { Authorization: 'Bearer secret-token' } } })))
        .mockReturnValueOnce(of({ data: { id: 'm1', threadId: 't', payload: { headers: [] } } }));
      await service.fetchMessage(3, 'm1');
      const logged = JSON.stringify((service as any).logger.warn.mock.calls);
      expect(logged).toContain('503');
      expect(logged).not.toContain('secret-token');
    });
  });

  describe('listRecentMessageIds (backfill)', () => {
    it('asks Gmail for the last N days, capped, and returns the ids oldest first', async () => {
      httpService.get.mockReturnValue(of({ data: { messages: [{ id: 'newest' }, { id: 'middle' }, { id: 'oldest' }] } }));

      await expect(service.listRecentMessageIds(3, 7, 50)).resolves.toEqual(['oldest', 'middle', 'newest']);

      expect(httpService.get.mock.calls[0][1].params).toEqual({ q: 'newer_than:7d', maxResults: 50 });
      expect(httpService.get.mock.calls[0][1].timeout).toBe(30_000);
    });

    it('returns an empty list when the mailbox has nothing in the window (Gmail omits "messages")', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await expect(service.listRecentMessageIds(3, 7, 50)).resolves.toEqual([]);
    });
  });

  describe('getCurrentHistoryId (catch-up)', () => {
    it('reads the mailbox\'s current historyId from the profile, with a timeout', async () => {
      httpService.get.mockReturnValue(of({ data: { emailAddress: 'me@gmail.com', messagesTotal: 10, threadsTotal: 4, historyId: '777' } }));

      await expect(service.getCurrentHistoryId(3)).resolves.toBe('777');

      expect(httpService.get.mock.calls[0][0]).toBe('https://gmail.googleapis.com/gmail/v1/users/me/profile');
      expect(httpService.get.mock.calls[0][1].headers.Authorization).toBe('Bearer access-token');
      expect(httpService.get.mock.calls[0][1].timeout).toBe(30_000);
    });

    it('retries a transient failure like every other Gmail read', async () => {
      httpService.get
        .mockReturnValueOnce(throwError(() => Object.assign(new Error('status 503'), { response: { status: 503 } })))
        .mockReturnValueOnce(of({ data: { historyId: '778' } }));

      await expect(service.getCurrentHistoryId(3)).resolves.toBe('778');
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });
  });
});
