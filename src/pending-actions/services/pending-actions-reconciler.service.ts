import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobSearchService } from '../../job-search/job-search.service';
import { PendingActionEntity } from '../entities/pending-action.entity';
import { PendingActionResolution, PendingActionType } from '../enums/pending-action.enum';
import { AutoCreateApplicationProposed } from '../interfaces/pending-action.interface';
import { PendingActionsService } from './pending-actions.service';

/** Below this a company stub ("ai", "go") would match unrelated applications. */
const MIN_COMPANY_STUB_LENGTH = 3;

/**
 * Keeps the proposals a user sees in step with what they have done by hand.
 *
 * "Add an application for Acme?" is queued when a confirmation email arrives
 * and there is no application yet. If the user then adds Acme themselves, the
 * proposal is moot. This runs when the user reads their proposals, so their own
 * action is the trigger: it needs no stored flag, no timer, and no hook from
 * the application endpoints (which would make the job-search and pending-actions
 * modules depend on each other).
 */
@Injectable()
export class PendingActionsReconciler {
  private readonly logger = new Logger(PendingActionsReconciler.name);

  constructor(
    private readonly jobSearchService: JobSearchService,
    private readonly pendingActions: PendingActionsService,
  ) { }

  /** Returns the actions that are still worth showing; resolves the ones the user already did. */
  async dropSatisfied(userId: number, actions: PendingActionEntity[]): Promise<PendingActionEntity[]> {
    const open: PendingActionEntity[] = [];
    for (const action of actions) {
      if (!(await this.resolveIfSatisfied(userId, action))) open.push(action);
    }
    return open;
  }

  private async resolveIfSatisfied(userId: number, action: PendingActionEntity): Promise<boolean> {
    if (action.proposedChange.kind !== PendingActionType.AutoCreateApplication) return false;
    const { companyName, threadId } = action.proposedChange as AutoCreateApplicationProposed;
    if (!companyName || companyName.length < MIN_COMPANY_STUB_LENGTH) return false;

    const existing = await this.jobSearchService.adoptExisting(userId, companyName, threadId);
    if (!existing) return false;

    try {
      // There is no "superseded" resolution (adding one is a Postgres enum
      // migration). ACCEPTED is the closest truth: the application it proposed
      // now exists.
      await this.pendingActions.markResolved(action.id, PendingActionResolution.ACCEPTED);
      this.logger.log(`Pending action ${action.id} resolved: user ${userId} already has "${existing.companyName}"`);
    } catch (err) {
      // A concurrent read already resolved it, or it was removed meanwhile.
      if (!(err instanceof ConflictException || err instanceof NotFoundException)) throw err;
    }
    return true;
  }
}
