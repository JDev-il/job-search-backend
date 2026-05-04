import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ApplicationStatus,
  TERMINAL_STATUSES,
} from '../../applications/enums/application-status.enum';
import { EmailIntentMapper } from '../../emails/mapper/email-intent.mapper';
import { JobSearchService } from '../../job-search/job-search.service';
import { AcceptPendingActionDto } from '../dto/pending-action.dto';
import { PendingActionEntity } from '../entities/pending-action.entity';
import { PendingActionType } from '../enums/pending-action.enum';
import { AutoCreateApplicationProposed, LinkThreadToApplicationProposed } from '../interfaces/pending-action.interface';

@Injectable()
export class PendingActionsExecutor {
  private readonly logger = new Logger(PendingActionsExecutor.name);

  constructor(
    private readonly jobSearchService: JobSearchService,
    private readonly intentMapper: EmailIntentMapper,
  ) { }

  /**
   * Routes an accepted PendingAction to the right mutation. Re-validates
   * isValidForIntent defensively in case the enum changed between creation
   * and acceptance, and rejects status changes against TERMINAL_STATUSES.
   */
  async execute(action: PendingActionEntity, body: AcceptPendingActionDto): Promise<void> {
    switch (action.type) {
      case PendingActionType.StatusChange:
        return this.executeStatusChange(action);
      case PendingActionType.AutoCreateApplication:
        return this.executeAutoCreate(action);
      case PendingActionType.LinkThreadToApplication:
        return this.executeLinkThread(action, body);
      case PendingActionType.DraftFollowUp:
        // Out of scope.
        this.logger.warn(`DRAFT_FOLLOW_UP execution not implemented (action=${action.id})`);
        return;
    }
  }

  private async executeStatusChange(action: PendingActionEntity): Promise<void> {
    if (action.proposedChange.kind !== PendingActionType.StatusChange) {
      throw new BadRequestException('proposedChange does not match action type');
    }
    const { jobId, toStatus, intent } = action.proposedChange;
    if (!this.intentMapper.isValidForIntent(intent, toStatus)) {
      throw new BadRequestException(
        `Status ${toStatus} is no longer valid for intent ${intent}`,
      );
    }
    const target = await this.jobSearchService.findById(action.userId, jobId);
    if (!target) {
      throw new NotFoundException(`Application ${jobId} not found`);
    }
    if (TERMINAL_STATUSES.has(target.status as ApplicationStatus)) {
      throw new ConflictException(
        'This application is already in a closed state — reopen it manually if needed.',
      );
    }
    await this.jobSearchService.setStatus(action.userId, jobId, toStatus);
  }

  private async executeAutoCreate(action: PendingActionEntity): Promise<void> {
    if (action.proposedChange.kind !== PendingActionType.AutoCreateApplication) {
      throw new BadRequestException('proposedChange does not match action type');
    }
    const { companyName, status, intent, threadId } = action.proposedChange as AutoCreateApplicationProposed;
    if (!this.intentMapper.isValidForIntent(intent, status)) {
      throw new BadRequestException(
        `Status ${status} is no longer valid for intent ${intent}`,
      );
    }
    await this.jobSearchService.createAutoApplication(
      action.userId,
      companyName,
      status,
      threadId,
    );
  }

  private async executeLinkThread(
    action: PendingActionEntity,
    body: AcceptPendingActionDto,
  ): Promise<void> {
    if (action.proposedChange.kind !== PendingActionType.LinkThreadToApplication) {
      throw new BadRequestException('proposedChange does not match action type');
    }
    const { jobId } = body;
    if (!jobId) {
      throw new BadRequestException('jobId is required when accepting LINK_THREAD_TO_APPLICATION');
    }
    const candidates = action.evidence.candidates ?? [];
    if (!candidates.some(c => c.jobId === jobId)) {
      throw new BadRequestException('Selected jobId is not among the candidate set');
    }
    const target = await this.jobSearchService.findById(action.userId, jobId);
    if (!target) {
      throw new NotFoundException(`Application ${jobId} not found`);
    }
    const { threadId, toStatus, intent } = action.proposedChange as LinkThreadToApplicationProposed;
    if (toStatus) {
      if (!this.intentMapper.isValidForIntent(intent, toStatus)) {
        throw new BadRequestException(
          `Status ${toStatus} is no longer valid for intent ${intent}`,
        );
      }
      if (TERMINAL_STATUSES.has(target.status as ApplicationStatus)) {
        throw new ConflictException(
          'This application is already in a closed state — reopen it manually if needed.',
        );
      }
    }
    await this.jobSearchService.setThreadId(action.userId, jobId, threadId);
    if (toStatus) {
      await this.jobSearchService.setStatus(action.userId, jobId, toStatus);
    }
  }
}
