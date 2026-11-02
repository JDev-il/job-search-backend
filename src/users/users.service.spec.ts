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
