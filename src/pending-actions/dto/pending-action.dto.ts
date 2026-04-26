import { IsInt, IsOptional, Min } from 'class-validator';
import { PendingActionResolution, PendingActionType } from '../enums/pending-action.enum';
import {
  PendingActionEvidence,
  PendingActionProposedChange,
} from '../interfaces/pending-action.interface';

export class AcceptPendingActionDto {
  /** Required for LINK_THREAD_TO_APPLICATION — the candidate jobId the user picked. */
  @IsInt()
  @IsOptional()
  @Min(1)
  jobId?: number;
}

export class PendingActionResponseDto {
  id: number;
  type: PendingActionType;
  question: string;
  jobId: number | null;
  evidence: PendingActionEvidence;
  proposedChange: PendingActionProposedChange;
  resolution: PendingActionResolution;
  createdAt: Date;
  resolvedAt: Date | null;
}
