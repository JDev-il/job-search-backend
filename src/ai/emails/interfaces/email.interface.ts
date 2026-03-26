import { ApplicationStatus } from '../../../applications/enums/application-status.enum';
import { EmailIntent, RuleField, RuleStrength } from '../enums/email.enum';

// Scoring map used internally by the rule engine
export type IntentSignalRule = Record<EmailIntent, number>;
export type TIntentToStatus = Record<EmailIntent, ApplicationStatus>;
export type EmailIntentSource = 'rules' | 'llm' | 'cache';

// Email data shapes
export interface ParsedEmail {
  subject: string;
  bodyText: string;
  snippet?: string;
  sender: string;
  senderDomain?: string;
}

export interface NormalizedEmail extends ParsedEmail {
  bodyCleaned: string;
}

// Rule definitions
export interface EmailSignalRule {
  phrase: string;
  intent: EmailIntent;
  field: RuleField;
  weight: number;
  strength?: RuleStrength;
  caseSensitive?: boolean;
}

export interface ISignalRule {
  intent: EmailIntent;
  confidence: number;
}
export interface IRoleType {
  role: 'system' | 'user';
  content: string;
}

// Classification result contracts
export interface RuleClassificationResult {
  intent: EmailIntent;
  confidence: number;
  matchedRules: EmailSignalRule[];
  source: Exclude<EmailIntentSource, 'llm' | 'cache'>;
}

export interface LLMClassificationResult {
  intent: EmailIntent;
  confidence: number;
  suggestedStatus?: ApplicationStatus;
  reasoning?: string;
  source: Exclude<EmailIntentSource, 'rules' | 'cache'>;
}

export interface LLMRawEmailResponse {
  intent: string;
  confidence: number;
  suggestedStatus?: string;
  reasoning?: string;
}

/** Unified result returned by the full classification pipeline */
export interface EmailClassificationResult {
  intent: EmailIntent;
  confidence: number;
  suggestedStatus?: ApplicationStatus;
  matchedRules?: EmailSignalRule[];
  reasoning?: string;
  source: EmailIntentSource;
}


// Cache entry
export interface EmailClassificationCacheEntry {
  fingerprint: string;
  subjectFingerprint?: string;
  createdAt: Date;
  updatedAt: Date;
  intent: EmailIntent;
  confidence: number;
  source: Exclude<EmailIntentSource, 'cache'>;
  matchedRulePhrases?: string[];
  verifiedByUser?: boolean;
}