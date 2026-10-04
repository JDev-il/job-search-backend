import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSearchCriteriaEntity } from './entities/job-search-criteria.entity';

@Injectable()
export class JobSearchCriteriaService {
  constructor(
    @InjectRepository(JobSearchCriteriaEntity)
    private readonly jobSearchCriteriaRepository: Repository<JobSearchCriteriaEntity>,
  ) { }

  // Previously had no `where` clause at all — it returned every user's
  // criteria to whoever called the (also unguarded) controller route.
  async getJobCriteriaData(userId: number): Promise<JobSearchCriteriaEntity[]> {
    const criterias = await this.jobSearchCriteriaRepository.find({
      where: { user: { userId } },
    });
    if (!criterias.length) {
      throw new NotFoundException({ error: 'Criterias not found' })
    }
    return criterias;
  }
}
