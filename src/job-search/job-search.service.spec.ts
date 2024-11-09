import { Test, TestingModule } from '@nestjs/testing';
import { JobSearchService } from './job-search.service';

describe('JobSearchService', () => {
  let service: JobSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobSearchService],
    }).compile();

    service = module.get<JobSearchService>(JobSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
