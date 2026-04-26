import { ApplicationStatus } from '../../applications/enums/application-status.enum';
import { EmailIntent } from '../../emails/enums/email.enum';
import { EmailIntentSource } from '../../emails/interfaces/email.interface';
import { PendingActionType } from '../enums/pending-action.enum';



export interface CreatePendingActionInput {
  userId: number;
  jobId?: number | null;
  type: PendingActionType;
  evidence: PendingActionEvidence;
  proposedChange: PendingActionProposedChange;
  question: string;
  gmailMessageId: string;
}

/**
 * Evidence stored on a PendingAction. Holds ids and a short snippet only —
 * never raw email bodies.
 */
export interface PendingActionEvidence {
  gmailMessageId: string;
  gmailThreadId?: string;
  senderDomain?: string;
  senderDisplayName?: string;
  subject?: string;
  snippet?: string;
  classification: {
    intent: EmailIntent;
    confidence: number;
    source: EmailIntentSource;
    reasoning?: string;
  };
  /** Top candidate applications for LINK_THREAD_TO_APPLICATION. */
  candidates?: PendingActionCandidate[];
  /** Company name extracted from sender (non-ATS) or display name (ATS). */
  extractedCompanyName?: string;
  /** True when sender domain belongs to a known ATS platform. */
  isAtsDomain?: boolean;
}

export interface PendingActionCandidate {
  jobId: number;
  companyName: string;
  status: string;
  applicationDate: Date | string;
}

/**
 * The mutation that will be performed if the user accepts. Type-discriminated
 * by the parent PendingActionType.
 */
export type PendingActionProposedChange =
  | StatusChangeProposed
  | AutoCreateApplicationProposed
  | LinkThreadToApplicationProposed
  | DraftFollowUpProposed;

export interface StatusChangeProposed {
  kind: 'STATUS_CHANGE';
  jobId: number;
  fromStatus: string;
  toStatus: ApplicationStatus;
  intent: EmailIntent;
}

export interface AutoCreateApplicationProposed {
  kind: 'AUTO_CREATE_APPLICATION';
  companyName: string;
  status: ApplicationStatus;
  intent: EmailIntent;
  threadId?: string;
}

export interface LinkThreadToApplicationProposed {
  kind: 'LINK_THREAD_TO_APPLICATION';
  threadId: string;
  /**
   * On accept, the user picks one of evidence.candidates. The chosen jobId is
   * supplied at accept-time, not at creation-time.
   */
  intent: EmailIntent;
  /** Status update to apply to the chosen job, if validated. */
  toStatus?: ApplicationStatus;
}

export interface DraftFollowUpProposed {
  kind: 'DRAFT_FOLLOW_UP';
  jobId?: number;
}
