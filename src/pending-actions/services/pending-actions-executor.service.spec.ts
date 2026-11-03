import { ApplicationStatus } from '../../applications/enums/application-status.enum';
import { EmailIntent } from '../../emails/enums/email.enum';
import { PendingActionType } from '../enums/pending-action.enum';
import { PendingActionsExecutor } from './pending-actions-executor.service';

const autoCreate = (over: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 3,
  type: PendingActionType.AutoCreateApplication,
  proposedChange: {
    kind: PendingActionType.AutoCreateApplication,
    companyName: 'acme',
    status: ApplicationStatus.AWAITING_RESPONSE,
    intent: EmailIntent.CONFIRMATION,
    threadId: 't1',
    ...over,
  },
  evidence: {},
}) as any;

describe('PendingActionsExecutor: AUTO_CREATE_APPLICATION', () => {
  let jobSearchService: { adoptExisting: jest.Mock; createAutoApplication: jest.Mock };
  let executor: PendingActionsExecutor;

  beforeEach(() => {
    jobSearchService = {
      adoptExisting: jest.fn().mockResolvedValue(null),
      createAutoApplication: jest.fn().mockResolvedValue({ jobId: 99 }),
    };
    executor = new PendingActionsExecutor(
      jobSearchService as any,
      { isValidForIntent: jest.fn().mockReturnValue(true) } as any,
    );
  });

  it('creates the application when the user has none for that company', async () => {
    await executor.execute(autoCreate(), {});

    expect(jobSearchService.createAutoApplication).toHaveBeenCalledWith(
      3, 'acme', ApplicationStatus.AWAITING_RESPONSE, 't1',
    );
  });

  it('does not create a duplicate when the user already added that application themselves', async () => {
    jobSearchService.adoptExisting.mockResolvedValue({ jobId: 7 });

    await executor.execute(autoCreate(), {});

    expect(jobSearchService.adoptExisting).toHaveBeenCalledWith(3, 'acme', 't1');
    expect(jobSearchService.createAutoApplication).not.toHaveBeenCalled();
  });

  it('still refuses a status that is no longer valid for the intent', async () => {
    const mapper = { isValidForIntent: jest.fn().mockReturnValue(false) };
    executor = new PendingActionsExecutor(jobSearchService as any, mapper as any);

    await expect(executor.execute(autoCreate(), {})).rejects.toThrow('no longer valid');

    expect(jobSearchService.adoptExisting).not.toHaveBeenCalled();
    expect(jobSearchService.createAutoApplication).not.toHaveBeenCalled();
  });
});
