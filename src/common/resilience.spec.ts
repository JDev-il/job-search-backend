import { isRateLimited, isTransientHttpError, retryWithBackoff } from './resilience';

const httpError = (status: number, data?: unknown, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data, headers } });
const networkError = (code: string) => Object.assign(new Error(code), { code });
const rateLimit403 = (reason: string) => httpError(403, { error: { errors: [{ reason }] } });

describe('isTransientHttpError', () => {
  it.each([
    ['429', httpError(429)],
    ['408', httpError(408)],
    ['500', httpError(500)],
    ['503', httpError(503)],
    ['403 rateLimitExceeded', rateLimit403('rateLimitExceeded')],
    ['403 userRateLimitExceeded', rateLimit403('userRateLimitExceeded')],
    ['ECONNRESET', networkError('ECONNRESET')],
    ['ECONNABORTED (axios timeout)', networkError('ECONNABORTED')],
    ['ETIMEDOUT', networkError('ETIMEDOUT')],
  ])('retries %s', (_n, err) => expect(isTransientHttpError(err)).toBe(true));

  it.each([
    ['400', httpError(400)],
    ['401', httpError(401)],
    ['404', httpError(404)],
    ['403 without a rate-limit reason (a real permission problem)', rateLimit403('insufficientPermissions')],
    ['403 dailyLimitExceeded (waiting seconds will not help)', rateLimit403('dailyLimitExceeded')],
    ['a plain programming error', new TypeError('x is not a function')],
  ])('does not retry %s', (_n, err) => expect(isTransientHttpError(err)).toBe(false));
});

describe('isRateLimited', () => {
  it('is true for 429 and 403 rate-limit reasons only', () => {
    expect(isRateLimited(httpError(429))).toBe(true);
    expect(isRateLimited(rateLimit403('userRateLimitExceeded'))).toBe(true);
    expect(isRateLimited(httpError(503))).toBe(false);
    expect(isRateLimited(networkError('ECONNRESET'))).toBe(false);
    expect(isRateLimited(rateLimit403('insufficientPermissions'))).toBe(false);
  });
});

describe('retryWithBackoff', () => {
  const opts = (over = {}) => ({ sleep: jest.fn().mockResolvedValue(undefined), random: () => 0, ...over });

  it('returns the first success without sleeping', async () => {
    const o = opts();
    await expect(retryWithBackoff(async () => 'ok', o)).resolves.toBe('ok');
    expect(o.sleep).not.toHaveBeenCalled();
  });

  it('retries transient failures with truncated exponential backoff, then succeeds', async () => {
    const o = opts({ baseMs: 1000, maxMs: 3000 });
    const fn = jest.fn()
      .mockRejectedValueOnce(httpError(503))
      .mockRejectedValueOnce(httpError(503))
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValue('ok');

    await expect(retryWithBackoff(fn, o)).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(4);
    expect(o.sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 3000]); // 1s, 2s, then capped at maxMs (4s -> 3s)
  });

  it('adds up to a second of jitter (Google: 2^n seconds plus a random number of milliseconds)', async () => {
    const o = opts({ baseMs: 1000, random: () => 0.5 });
    const fn = jest.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValue('ok');

    await retryWithBackoff(fn, o);

    expect(o.sleep).toHaveBeenCalledWith(1500);
  });

  it('honours Retry-After on a 429 when it is longer than the computed delay, within the cap', async () => {
    const o = opts({ baseMs: 1000, maxMs: 16000 });
    const fn = jest.fn().mockRejectedValueOnce(httpError(429, undefined, { 'retry-after': '7' })).mockResolvedValue('ok');

    await retryWithBackoff(fn, o);

    expect(o.sleep).toHaveBeenCalledWith(7000);
  });

  it('gives up after the last attempt and throws the original error', async () => {
    const o = opts({ attempts: 3 });
    const boom = httpError(503);
    const fn = jest.fn().mockRejectedValue(boom);

    await expect(retryWithBackoff(fn, o)).rejects.toBe(boom);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(o.sleep).toHaveBeenCalledTimes(2);
  });

  it('throws a non-transient error at once', async () => {
    const o = opts();
    const notFound = httpError(404);
    const fn = jest.fn().mockRejectedValue(notFound);

    await expect(retryWithBackoff(fn, o)).rejects.toBe(notFound);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(o.sleep).not.toHaveBeenCalled();
  });

  it('reports each retry so callers can log it', async () => {
    const onRetry = jest.fn();
    const fn = jest.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValue('ok');

    await retryWithBackoff(fn, opts({ onRetry }));

    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number));
  });
});
