import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { JobSearchEntity } from './entities/job-search.entity';

@Injectable()
export class JobSearchService {
  constructor(
    @InjectRepository(JobSearchEntity)
    private readonly jobSearchRepository: Repository<JobSearchEntity>,
  ) { }

  async findUserData(userId: number): Promise<JobSearchEntity[]> {
    const jobs = await this.jobSearchRepository.findBy({ user: { userId: userId } });
    return jobs;
  }

  async addNewApplicationRow() {
    const newJobSearch = this.jobSearchRepository.create({
      status: 'Pending',
      companyName: 'Example Corp',
      companyLocation: 'San Francisco',
      positionType: 'Frontend Developer',
      positionStack: 'React',
      applicationPlatform: 'LinkedIn',
      applicationDate: new Date('2024-12-01'),
      user: new UserEntity, // UserEntity instance
    });

    await this.jobSearchRepository.save(newJobSearch);
  }
}