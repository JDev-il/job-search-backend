/**
 * Job boards. They are routed like the platforms below (the sender's domain
 * says nothing about the employer), but unlike them most of what they send is
 * alerts and chat notices, not application mail. So the LLM is not shown mail
 * from them unless the rules already found something in it.
 */
export const JOB_BOARD_DOMAINS: readonly string[] = [
  'indeed.com',
  'linkedin.com',
  'linkedin.cn',
  'glassdoor.com',
  'alljobs.co.il',
  'drushim.co.il',
  'jobmaster.co.il',
];

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

  // ── Job boards (see JOB_BOARD_DOMAINS) ───────────────────────────────────
  ...JOB_BOARD_DOMAINS,

  // ── Assessment & interview platforms ────────────────────────────────────
  'hackerrank.com',
  'codility.com',
  'hirevue.com',
  'codesignal.com',
  'testgorilla.com',
  'karat.com',
];

/**
 * Two-label suffixes (second-level registries under a country code) where the
 * company is the label in FRONT of the suffix: acme.co.il -> acme, not "co".
 * The common ones for the markets this app is used in, not the full public
 * suffix list: a domain under a suffix missing here is read as if it had a
 * one-label suffix.
 */
export const SECOND_LEVEL_DOMAIN_SUFFIXES: ReadonlySet<string> = new Set([
  // Israel
  'co.il', 'org.il', 'ac.il', 'gov.il', 'net.il', 'muni.il', 'k12.il', 'idf.il',
  // United Kingdom
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'sch.uk',
  // Australia, New Zealand
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'asn.au', 'id.au',
  'co.nz', 'org.nz', 'net.nz', 'ac.nz', 'govt.nz',
  // Asia
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp',
  'co.in', 'net.in', 'org.in', 'ac.in', 'gov.in', 'firm.in', 'gen.in', 'ind.in',
  'co.kr', 'or.kr', 'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'com.hk', 'com.tw',
  'com.sg', 'edu.sg', 'com.my', 'com.ph', 'co.id', 'co.th', 'com.vn',
  // Americas
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'com.mx', 'com.ar', 'com.co', 'com.pe', 'com.ve',
  // Africa, Middle East, Europe
  'co.za', 'org.za', 'com.ng', 'co.ke', 'com.eg', 'com.sa', 'com.pk', 'com.tr',
  'com.ua', 'com.pl', 'com.pt', 'com.gr', 'com.cy',
]);
