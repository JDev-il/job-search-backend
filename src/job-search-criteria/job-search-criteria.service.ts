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

  async getJobCriteriaData(): Promise<JobSearchCriteriaEntity[]> {
    const criterias = await this.jobSearchCriteriaRepository.find();
    if (!criterias.length) {
      throw new NotFoundException({ error: 'Criterias not found' })
    }
    return criterias;
  }
}