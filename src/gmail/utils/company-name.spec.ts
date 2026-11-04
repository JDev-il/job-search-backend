import { SECOND_LEVEL_DOMAIN_SUFFIXES } from '../constants/gmail-data';
import { extractCompanyName } from './company-name';

describe('extractCompanyName', () => {
  it.each([
    ['acme.com', 'acme'],
    ['careers.acme.com', 'acme'],
    ['mail.eu.acme.io', 'acme'],
    ['unframe.com', 'unframe'],
    ['eu.greenhouse-mail.io', 'greenhouse-mail'],
  ])('takes the label before the TLD: %s -> %s', (domain, expected) => {
    expect(extractCompanyName(domain)).toBe(expected);
  });

  it.each([
    ['acme.co.il', 'acme'],
    ['jobs.acme.co.il', 'acme'],
    ['mail.eu.acme.co.il', 'acme'],
    ['acme.org.il', 'acme'],
    ['acme.ac.il', 'acme'],
    ['acme.co.uk', 'acme'],
    ['mail.acme.co.uk', 'acme'],
    ['recruiting.acme.com.au', 'acme'],
    ['acme.co.nz', 'acme'],
    ['acme.com.br', 'acme'],
    ['acme.co.jp', 'acme'],
    ['careers.acme.co.in', 'acme'],
    ['acme.com.sg', 'acme'],
    ['acme.co.za', 'acme'],
    ['acme.com.co', 'acme'],
  ])('skips a two-part suffix, so the company is not "co" or "com": %s -> %s', (domain, expected) => {
    expect(extractCompanyName(domain)).toBe(expected);
  });

  it('ignores case, surrounding whitespace and a trailing dot', () => {
    expect(extractCompanyName(' Jobs.Acme.CO.IL. ')).toBe('acme');
  });

  it('does not treat an ordinary second-level label as a suffix', () => {
    // "co" is only a suffix under a country code; under .com it is a company
    expect(extractCompanyName('mail.co.com')).toBe('co');
    expect(extractCompanyName('careers.org.com')).toBe('org');
  });

  it('copes with a bare label, a bare suffix and nothing at all', () => {
    expect(extractCompanyName('localhost')).toBe('localhost');
    expect(extractCompanyName('co.il')).toBe('co');
    expect(extractCompanyName('')).toBe('');
  });

  it('keeps the suffix list to lower-case "second.top" entries, which is what the lookup expects', () => {
    for (const suffix of SECOND_LEVEL_DOMAIN_SUFFIXES) expect(suffix).toMatch(/^[a-z0-9-]+\.[a-z]{2}$/);
  });
});
