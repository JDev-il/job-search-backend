import { ATS_DOMAINS, JOB_BOARD_DOMAINS } from './gmail-data';

describe('gmail-data domain lists', () => {
  it('keeps every job board in the routing list: their mail is still linked by thread, not matched on the domain', () => {
    for (const board of JOB_BOARD_DOMAINS) expect(ATS_DOMAINS).toContain(board);
  });

  it('keeps the application platforms in the routing list', () => {
    for (const platform of ['greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'comeet.io', 'hackerrank.com']) {
      expect(ATS_DOMAINS).toContain(platform);
    }
  });

  it('lists each domain once', () => {
    expect(new Set(ATS_DOMAINS).size).toBe(ATS_DOMAINS.length);
  });

  it('lists only bare lower-case domains, which is what the suffix match expects', () => {
    for (const domain of ATS_DOMAINS) expect(domain).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
  });
});
