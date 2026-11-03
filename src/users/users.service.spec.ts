import { UserService } from './users.service';

describe('UserService.clearGmailTokensIfRefreshToken', () => {
  let repo: { update: jest.Mock };
  let service: UserService;

  beforeEach(() => {
    repo = { update: jest.fn() };
    service = new UserService(repo as any);
  });

  it('only matches the row while it still holds the refresh token that failed', async () => {
    repo.update.mockResolvedValue({ affected: 1 });

    await expect(service.clearGmailTokensIfRefreshToken(3, 'refresh-1')).resolves.toBe(true);

    expect(repo.update).toHaveBeenCalledWith(
      { userId: 3, gmailRefreshToken: 'refresh-1' },
      expect.any(Object),
    );
  });

  it('reports false (and so changes nothing) when the user already reconnected with a newer token', async () => {
    repo.update.mockResolvedValue({ affected: 0 });

    await expect(service.clearGmailTokensIfRefreshToken(3, 'refresh-1')).resolves.toBe(false);
  });

  it('clears the gmail_* fields and nothing that belongs to the login', async () => {
    repo.update.mockResolvedValue({ affected: 1 });

    await service.clearGmailTokensIfRefreshToken(3, 'refresh-1');

    expect(repo.update.mock.calls[0][1]).toEqual({
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
      gmailHistoryId: null,
      gmailEmail: null,
    });
  });
});

describe('UserService.saveGmailWatchData', () => {
  let repo: { update: jest.Mock };
  let service: UserService;

  beforeEach(() => {
    repo = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    service = new UserService(repo as any);
  });

  it('always records the Gmail address', async () => {
    await service.saveGmailWatchData(3, '555', 'me@gmail.com');

    expect(repo.update).toHaveBeenCalledWith(3, { gmailEmail: 'me@gmail.com' });
  });

  it('seeds the history cursor only while none is stored, so re-registering the watch cannot skip unprocessed mail', async () => {
    await service.saveGmailWatchData(3, '555', 'me@gmail.com');

    const cursorWrite = repo.update.mock.calls.find(([, values]) => 'gmailHistoryId' in values);
    expect(cursorWrite).toBeDefined();
    const [criteria, values] = cursorWrite;
    expect(values).toEqual({ gmailHistoryId: '555' });
    // The criteria must pin "no cursor yet" (IsNull), not just the user id,
    // otherwise an existing cursor would be overwritten.
    expect(criteria.userId).toBe(3);
    expect(criteria.gmailHistoryId).toBeDefined();
    expect(criteria.gmailHistoryId._type).toBe('isNull');
  });
});
