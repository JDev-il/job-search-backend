import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '../../applications/enums/application-status.enum';
import { EmailIntent } from '../enums/email.enum';
import { TIntentToStatus } from '../interfaces/email.interface';

/**
 * Deterministic mapping from a high-confidence EmailIntent category
 * to the most representative ApplicationStatus value.
 *
 * This is the backend-owned policy layer, the LLM never decides the
 * final status directly; it only suggests, and this mapper validates.
 *
 * Returns undefined when no clear default mapping exists (e.g. UNKNOWN),
 * signalling that the caller should fall back to the LLM path or skip
 * the status update entirely.
 */

const INTENT_TO_STATUS: Partial<TIntentToStatus> = {
  [EmailIntent.CONFIRMATION]: ApplicationStatus.AWAITING_RESPONSE,
  [EmailIntent.REJECTION]: ApplicationStatus.REJECTED,
  [EmailIntent.INTERVIEW]: ApplicationStatus.INTERVIEW_SCHEDULED,
  [EmailIntent.ASSESSMENT]: ApplicationStatus.AWAITING_INTERVIEW,
  [EmailIntent.FOLLOW_UP]: ApplicationStatus.HR_REACHED_BACK,
  // EmailIntent.UNKNOWN is intentionally omitted, no safe default
};

/**
 * Maps an EmailIntent to a default ApplicationStatus.
 * Returns undefined if no deterministic mapping exists.
 */
@Injectable()
export class EmailIntentMapper {

  toApplicationStatus(intent: EmailIntent): ApplicationStatus | undefined {
    return INTENT_TO_STATUS[intent];
  }

  /**
   * Validates a suggested ApplicationStatus against the allowed values
   * for a given intent category. Used to vet LLM suggestions before
   * applying them.
   */
  isValidForIntent(intent: EmailIntent, status: ApplicationStatus): boolean {
    return ALLOWED_STATUSES_BY_INTENT[intent]?.includes(status) ?? false;
  }
}

/**
 * The full set of ApplicationStatus values that are semantically valid
 * for each EmailIntent category. Used by isValidForIntent() to constrain
 * LLM suggestions.
 */
export const ALLOWED_STATUSES_BY_INTENT: Partial<Record<EmailIntent, ApplicationStatus[]>> = {
  [EmailIntent.CONFIRMATION]: [
    ApplicationStatus.AWAITING_RESPONSE,
    ApplicationStatus.HR_REACHED_BACK,
    ApplicationStatus.AWAITING_DECISION,
    ApplicationStatus.AWAITING_RESULTS,
    ApplicationStatus.REAPPLIED,
  ],
  [EmailIntent.REJECTION]: [
    ApplicationStatus.REJECTED,
    ApplicationStatus.DID_NOT_PASS_HR,
    ApplicationStatus.DECIDED_TO_PASS,
    ApplicationStatus.LOW_SALARY,
    ApplicationStatus.PROBABLY_NOT,
    ApplicationStatus.ARCHIVED,
  ],
  [EmailIntent.INTERVIEW]: [
    ApplicationStatus.INTERVIEW_SCHEDULED,
    ApplicationStatus.AWAITING_INTERVIEW,
  ],
  [EmailIntent.ASSESSMENT]: [
    ApplicationStatus.AWAITING_INTERVIEW,
  ],
  [EmailIntent.FOLLOW_UP]: [
    ApplicationStatus.HR_REACHED_BACK,
    ApplicationStatus.AWAITING_RESPONSE,
  ],
};
