import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationDataDto } from '../auth/dto/data/application-data.dto';
import { JobSearchEntity } from './entities/job-search.entity';

@Injectable()
export class JobSearchService {
  constructor(
    @InjectRepository(JobSearchEntity)
    private readonly jobSearchRepository: Repository<JobSearchEntity>,
  ) { }

  async findApplicationData(id: number): Promise<JobSearchEntity[]> {
    const jobApplications = await this.jobSearchRepository.find({
      where: { user: { userId: id } },
      relations: ['user'],
    });
    const applications = [...jobApplications].map(data => { return { ...data, user: {} } }) as JobSearchEntity[];
    return applications;
  }

  async addNewApplicationRow(applicationDetails: ApplicationDataDto) {
    const positionStack = applicationDetails.positionStack;
    console.log(positionStack);

    const newJobSearch = this.jobSearchRepository.create(<JobSearchEntity>{
      status: applicationDetails.status,
      companyName: applicationDetails.companyName,
      companyLocation: applicationDetails.companyLocation,
      positionType: applicationDetails.positionType,
      positionStack: positionStack,
      applicationPlatform: applicationDetails.applicationPlatform,
      applicationDate: applicationDetails.applicationDate,
      notes: applicationDetails.notes,
      hunch: applicationDetails.hunch,
      user: { userId: applicationDetails.userId }, // Associate with an existing user
    });
    try {
      const savedJobSearch = await this.jobSearchRepository.save(newJobSearch);
      return savedJobSearch;
    } catch (error) {
      console.error('Error saving application:', error);
      throw new InternalServerErrorException('Could not save application');
    }
  }
}