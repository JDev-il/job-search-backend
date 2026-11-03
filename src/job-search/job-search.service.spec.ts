import { JobSearchService } from './job-search.service';

describe('JobSearchService.adoptExisting', () => {
  let service: JobSearchService;
  let findMatchingApplication: jest.SpyInstance;
  let setThreadId: jest.SpyInstance;

  beforeEach(() => {
    service = new JobSearchService({} as any);
    findMatchingApplication = jest.spyOn(service, 'findMatchingApplication');
    setThreadId = jest.spyOn(service, 'setThreadId').mockResolvedValue(undefined);
  });

  it('returns null and touches nothing when the user has no open application for the company', async () => {
    findMatchingApplication.mockResolvedValue(null);

    await expect(service.adoptExisting(3, 'acme', 't1')).resolves.toBeNull();

    expect(setThreadId).not.toHaveBeenCalled();
  });

  it('attaches the Gmail thread to the existing application when it has none', async () => {
    const existing = { jobId: 7, gmailThreadId: null };
    findMatchingApplication.mockResolvedValue(existing);

    await expect(service.adoptExisting(3, 'acme', 't1')).resolves.toBe(existing);

    expect(setThreadId).toHaveBeenCalledWith(3, 7, 't1');
  });

  it('never overwrites a thread the application is already linked to', async () => {
    findMatchingApplication.mockResolvedValue({ jobId: 7, gmailThreadId: 'older' });

    await service.adoptExisting(3, 'acme', 't1');

    expect(setThreadId).not.toHaveBeenCalled();
  });

  it('still reports the match when there is no thread to attach', async () => {
    const existing = { jobId: 7, gmailThreadId: null };
    findMatchingApplication.mockResolvedValue(existing);

    await expect(service.adoptExisting(3, 'acme')).resolves.toBe(existing);

    expect(setThreadId).not.toHaveBeenCalled();
  });
});
