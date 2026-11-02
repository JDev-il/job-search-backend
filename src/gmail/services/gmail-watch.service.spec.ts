import { of, throwError } from 'rxjs';
import { GmailReconnectRequiredException } from '../exceptions/gmail-reconnect-required.exception';
import { GmailWatchService } from './gmail-watch.service';

describe('GmailWatchService.registerWatch', () => {
  let httpService: { post: jest.Mock };
  let gmailAuthService: { getValidToken: jest.Mock };
  let userService: { saveGmailWatchData: jest.Mock };
  let service: GmailWatchService;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    httpService = { post: jest.fn() };
    gmailAuthService = { getValidToken: jest.fn().mockResolvedValue('access-token') };
    userService = { saveGmailWatchData: jest.fn().mockResolvedValue(undefined) };
    service = new GmailWatchService(
      httpService as any,
      { get: jest.fn().mockReturnValue('projects/p/topics/t') } as any,
      gmailAuthService as any,
      userService as any,
    );
    warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  it('registers the watch and stores the returned historyId', async () => {
    httpService.post.mockReturnValue(of({ data: { historyId: '555' } }));

    await service.registerWatch(3, 'me@gmail.com');

    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      { topicName: 'projects/p/topics/t' },
      { headers: { Authorization: 'Bearer access-token' } },
    );
    expect(userService.saveGmailWatchData).toHaveBeenCalledWith(3, '555', 'me@gmail.com');
  });

  it('does not throw and does not call Gmail when the user has to reconnect', async () => {
    gmailAuthService.getValidToken.mockRejectedValue(new GmailReconnectRequiredException());

    await expect(service.registerWatch(3, 'me@gmail.com')).resolves.toBeUndefined();

    expect(httpService.post).not.toHaveBeenCalled();
    expect(userService.saveGmailWatchData).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('reconnected'));
    expect(error).not.toHaveBeenCalled();
  });

  it('logs the real cause when Gmail rejects the watch call', async () => {
    httpService.post.mockReturnValue(
      throwError(() => Object.assign(new Error('Request failed with status code 403'), {
        response: { status: 403, data: { error: { message: 'Pub/Sub publish permission missing' } } },
        config: { headers: { Authorization: 'Bearer secret-token' } },
      })),
    );

    await expect(service.registerWatch(3, 'me@gmail.com')).resolves.toBeUndefined();

    const logged = error.mock.calls[0][0] as string;
    expect(logged).toContain('status code 403');
    expect(logged).toContain('[HTTP 403]');
    expect(logged).toContain('Pub/Sub publish permission missing');
    expect(logged).not.toContain('secret-token');
  });

  it('also logs (instead of throwing) an unexpected failure while fetching the token', async () => {
    gmailAuthService.getValidToken.mockRejectedValue(new Error('db down'));

    await expect(service.registerWatch(3, 'me@gmail.com')).resolves.toBeUndefined();
    expect(error.mock.calls[0][0]).toContain('db down');
  });
});
