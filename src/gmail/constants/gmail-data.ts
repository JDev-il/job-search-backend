/**
 * ATS platforms whose noreply domains carry no useful company signal - the
 * employer name is in the From display-name or Subject. 
 * These domains always route to LINK_THREAD_TO_APPLICATION (with candidates) instead of
 * a fuzzy match against the domain stub.
 */
export const ATS_DOMAINS: readonly string[] = [
  'workday.com',
  'myworkday.com',
  'myworkdayjobs.com',
  'greenhouse.io',
  'grnh.se',
  'lever.co',
  'ashbyhq.com',
  'smartrecruiters.com',
  'jobvite.com',
  'icims.com',
];