import { EmailStatus, RuleField, RuleStrength } from "../enums/email.enum";

export interface ParsedEmail {
  subject: string;
  bodyText: string;
  snippet?: string;
  sender: string;
  senderDomain?: string;
}

export interface NormalizedEmail extends ParsedEmail {
  bodyCleaned?: string;
}

export interface EmailSignalRule {
  phrase: string;
  intent: EmailStatus;
  field: RuleField;
  weight: number;
  strength?: RuleStrength;
  caseSensitive?: boolean;
}

export interface EmailClassificationResult {
  intent: EmailStatus;
  confidence: number;
  matchedRules: EmailSignalRule[];
  source: 'rules' | 'llm' | 'cache';
}

export type IntentSignalRule = Record<EmailStatus, number>;