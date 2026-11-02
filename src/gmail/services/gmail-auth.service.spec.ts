import { HttpStatus } from '@nestjs/common';
import { GMAIL_RECONNECT_REQUIRED, GmailReconnectRequiredException } from '../exceptions/gmail-reconnect-required.exception';
import { GmailAuthService } from './gmail-auth.service';

const googleError = (status: number, data: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });

const invalidGrant = () => googleError(400, { error: 'invalid_grant', error_description: 'Bad Request' });

describe('GmailAuthService.getValidToken', () => {
  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 3_600_000);

  let userService: {
    getGmailTokens: jest.Mock;
    updateGmailAccessToken: jest.Mock;
    clearGmailTokensIfRefreshToken: jest.Mock;
  };
  let helper: { gmailRefreshAccessToken: jest.Mock };
  let service: GmailAuthService;

  const storeTokens = (overrides: Record<string, unknown> = {}) =>
    userService.getGmailTokens.mockResolvedValue({
      gmailAccessToken: 'old-access',
      gmailRefreshToken: 'refresh-1',
      gmailTokenExpiry: past,
      gmailEmail: 'me@gmail.com',
      ...overrides,
    });

  beforeEach(() => {
    userService = {
      getGmailTokens: jest.fn(),
      updateGmailAccessToken: jest.fn().mockResolvedValue(undefined),
      clearGmailTokensIfRefreshToken: jest.fn().mockResolvedValue(true),
    };
    helper = { gmailRefreshAccessToken: jest.fn() };
    service = new GmailAuthService(
      { get: jest.fn() } as any,
      {} as any,
      userService as any,
      helper as any,
      {} as any,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  });

  it('returns the stored access token while it is still valid, without calling Google', async () => {
    storeTokens({ gmailTokenExpiry: future });

    await expect(service.getValidToken(3)).resolves.toBe('old-access');
    expect(helper.gmailRefreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes an expired token and stores the new one', async () => {
    storeTokens();
    helper.gmailRefreshAccessToken.mockResolvedValue({ data: { access_token: 'new-access', expires_in: 3600 } });

    await expect(service.getValidToken(3)).resolves.toBe('new-access');
    expect(userService.updateGmailAccessToken).toHaveBeenCalledWith(3, 'new-access', expect.any(Date));
    expect(userService.clearGmailTokensIfRefreshToken).not.toHaveBeenCalled();
  });

  describe('when Google answers invalid_grant', () => {
    it('clears the connection for the refresh token that failed and asks the user to reconnect', async () => {
      storeTokens();
      helper.gmailRefreshAccessToken.mockRejectedValue(invalidGrant());

      await expect(service.getValidToken(3)).rejects.toBeInstanceOf(GmailReconnectRequiredException);

      expect(userService.clearGmailTokensIfRefreshToken).toHaveBeenCalledWith(3, 'refresh-1');
      expect(userService.updateGmailAccessToken).not.toHaveBeenCalled();
    });

    it('still reports reconnect-required when newer tokens replaced the failing one (and leaves them alone)', async () => {
      storeTokens();
      helper.gmailRefreshAccessToken.mockRejectedValue(invalidGrant());
      userService.clearGmailTokensIfRefreshToken.mockResolvedValue(false);

      await expect(service.getValidToken(3)).rejects.toBeInstanceOf(GmailReconnectRequiredException);
      expect((service as any).logger.warn).toHaveBeenCalledWith(expect.stringContaining('newer tokens are stored'));
    });

    it('fails with a 409 carrying a machine-readable code, never a 401 (a 401 logs the user out of the app)', async () => {
      storeTokens();
      helper.gmailRefreshAccessToken.mockRejectedValue(invalidGrant());

      const err = await service.getValidToken(3).catch((e) => e);

      expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(err.getResponse()).toEqual(expect.objectContaining({ code: GMAIL_RECONNECT_REQUIRED }));
    });
  });

  describe('when the refresh fails for any other reason', () => {
    it.each([
      ['a 5xx from Google', googleError(503, { error: 'backend_error' })],
      ['wrong client credentials', googleError(401, { error: 'invalid_client' })],
      ['a network failure', new Error('connect ETIMEDOUT')],
    ])('rethrows %s and keeps the stored connection', async (_label, failure) => {
      storeTokens();
      helper.gmailRefreshAccessToken.mockRejectedValue(failure);

      await expect(service.getValidToken(3)).rejects.toBe(failure);
      expect(userService.clearGmailTokensIfRefreshToken).not.toHaveBeenCalled();
    });
  });

  it('treats a user who never connected Gmail as reconnect-required (409), not as an expired session (401)', async () => {
    userService.getGmailTokens.mockResolvedValue({ gmailAccessToken: null, gmailRefreshToken: null });

    const err = await service.getValidToken(3).catch((e) => e);

    expect(err).toBeInstanceOf(GmailReconnectRequiredException);
    expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
  });
});
