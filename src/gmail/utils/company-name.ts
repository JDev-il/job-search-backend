import { SECOND_LEVEL_DOMAIN_SUFFIXES } from '../constants/gmail-data';

/**
 * The company a sender's domain points to: the label in front of the
 * registrable suffix. amazon.co.uk -> amazon, careers.acme.co.il -> acme,
 * mail.google.com -> google.
 *
 * A plain "second to last label" is wrong under a country code that has
 * second-level registries (acme.co.il -> "co"), and a name like "co" then
 * matches almost any application. Those suffixes are listed in
 * SECOND_LEVEL_DOMAIN_SUFFIXES.
 */
export function extractCompanyName(domain: string): string {
  const labels = domain.trim().toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels[0] ?? '';
  const lastTwo = labels.slice(-2).join('.');
  return SECOND_LEVEL_DOMAIN_SUFFIXES.has(lastTwo) ? labels[labels.length - 3] : labels[labels.length - 2];
}
