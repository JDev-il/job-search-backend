import { Test, TestingModule } from '@nestjs/testing';
import { JobSearchController } from './job-search.controller';

describe('JobSearchController', () => {
  let controller: JobSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobSearchController],
    }).compile();

    controller = module.get<JobSearchController>(JobSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
