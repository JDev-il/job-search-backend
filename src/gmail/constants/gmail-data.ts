/**
 * Platforms whose sender domains carry no useful employer signal — the company
 * name must be extracted from the From display-name or Subject instead.
 * Emails from these domains always route to LINK_THREAD_TO_APPLICATION
 * (with a candidate picker) rather than a fuzzy domain match.
 *
 * Criterion: does the email arrive from the platform's domain rather than
 * the employer's own domain? If yes → include here.
 */
export const ATS_DOMAINS: readonly string[] = [
  // ── Core ATS platforms ──────────────────────────────────────────────────
  'workday.com',
  'myworkday.com',
  'myworkdayjobs.com',
  'greenhouse.io',
  'grnh.se', // Greenhouse short-link domain
  'lever.co',
  'ashbyhq.com',
  'smartrecruiters.com',
  'jobvite.com',
  'icims.com',
  'taleo.net', // Oracle Taleo
  'taleodirect.com',
  'successfactors.com', // SAP SuccessFactors
  'bamboohr.com',
  'workable.com',
  'teamtailor.com',
  'recruitee.com',
  'breezy.hr',
  'dover.io',
  'comeet.io',
  'comeet-notifications.com',

  // ── HR platforms that send recruitment emails ────────────────────────────
  'hibob.com',

  // ── Job boards ───────────────────────────────────────────────────────────
  'indeed.com',
  'linkedin.com',
  'linkedin.cn',
  'glassdoor.com',

  // ── Israeli job boards ───────────────────────────────────────────────────
  'alljobs.co.il',
  'drushim.co.il',
  'jobmaster.co.il',

  // ── Assessment & interview platforms ────────────────────────────────────
  'hackerrank.com',
  'codility.com',
  'hirevue.com',
  'codesignal.com',
  'testgorilla.com',
  'karat.com',
];
