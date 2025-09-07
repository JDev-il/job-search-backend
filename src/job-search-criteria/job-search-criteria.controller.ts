import { Controller, Get } from '@nestjs/common';
import { JobSearchCriteriaEntity } from './entities/job-search-criteria.entity';
import { JobSearchCriteriaService } from './job-search-criteria.service';

@Controller('jobsearchcriteria')
export class JobSearchCriteriaController {
  constructor(private readonly jobSearchCriteriaService: JobSearchCriteriaService) { }

  @Get('criteria')
  async getJobSeaarchCriteria(): Promise<JobSearchCriteriaEntity[]> {
    const criterias = await this.jobSearchCriteriaService.getJobCriteriaData();
    return criterias;
  }
}
