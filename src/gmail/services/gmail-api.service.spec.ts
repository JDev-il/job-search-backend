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
  });
});
