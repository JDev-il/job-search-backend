import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApplicationStatus } from '../../applications/enums/application-status.enum';
import { EmailIntent } from '../../emails/enums/email.enum';
import { PendingActionResolution, PendingActionType } from '../enums/pending-action.enum';
import { PendingActionsReconciler } from './pending-actions-reconciler.service';

const autoCreate = (id: number, companyName: string, threadId = `t${id}`) => ({
  id,
  userId: 3,
  type: PendingActionType.AutoCreateApplication,
  proposedChange: {
    kind: PendingActionType.AutoCreateApplication,
    companyName,
    status: ApplicationStatus.AWAITING_RESPONSE,
    intent: EmailIntent.CONFIRMATION,
    threadId,
  },
}) as any;

const statusChange = (id: number) => ({
  id,
  userId: 3,
  type: PendingActionType.StatusChange,
  proposedChange: { kind: PendingActionType.StatusChange, jobId: 5 },
}) as any;

describe('PendingActionsReconciler.dropSatisfied', () => {
  let jobSearchService: { adoptExisting: jest.Mock };
  let pendingActions: { markResolved: jest.Mock };
  let reconciler: PendingActionsReconciler;

  beforeEach(() => {
    jobSearchService = { adoptExisting: jest.fn().mockResolvedValue(null) };
    pendingActions = { markResolved: jest.fn().mockResolvedValue(undefined) };
    reconciler = new PendingActionsReconciler(jobSearchService as any, pendingActions as any);
  });

  it('drops and resolves a proposal to add an application the user has already added', async () => {
    jobSearchService.adoptExisting.mockResolvedValue({ jobId: 7 });
    const stale = autoCreate(1, 'acme');

    await expect(reconciler.dropSatisfied(3, [stale])).resolves.toEqual([]);

    expect(jobSearchService.adoptExisting).toHaveBeenCalledWith(3, 'acme', 't1');
    expect(pendingActions.markResolved).toHaveBeenCalledWith(1, PendingActionResolution.ACCEPTED);
  });

  it('keeps a proposal when the user has no such application yet', async () => {
    const open = autoCreate(1, 'acme');

    await expect(reconciler.dropSatisfied(3, [open])).resolves.toEqual([open]);

    expect(pendingActions.markResolved).not.toHaveBeenCalled();
  });

  it('leaves every other kind of proposal alone, without looking anything up', async () => {
    const other = statusChange(2);

    await expect(reconciler.dropSatisfied(3, [other])).resolves.toEqual([other]);

    expect(jobSearchService.adoptExisting).not.toHaveBeenCalled();
  });

  it('does not match on a very short company stub, which would match unrelated applications', async () => {
    const short = autoCreate(1, 'ai');

    await expect(reconciler.dropSatisfied(3, [short])).resolves.toEqual([short]);

    expect(jobSearchService.adoptExisting).not.toHaveBeenCalled();
  });

  it.each([
    ['already resolved by a concurrent request', new ConflictException('already accepted')],
    ['deleted meanwhile', new NotFoundException()],
  ])('still drops the proposal when it was %s', async (_label, error) => {
    jobSearchService.adoptExisting.mockResolvedValue({ jobId: 7 });
    pendingActions.markResolved.mockRejectedValue(error);

    await expect(reconciler.dropSatisfied(3, [autoCreate(1, 'acme')])).resolves.toEqual([]);
  });

  it('surfaces an unexpected failure instead of hiding it', async () => {
    jobSearchService.adoptExisting.mockResolvedValue({ jobId: 7 });
    pendingActions.markResolved.mockRejectedValue(new Error('connection lost'));

    await expect(reconciler.dropSatisfied(3, [autoCreate(1, 'acme')])).rejects.toThrow('connection lost');
  });
});
