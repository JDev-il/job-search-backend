import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

  async getApplications(id: number): Promise<JobSearchEntity[]> {
    try {
      const jobApplications = await this.jobSearchRepository.find({
        where: { user: { userId: id } },
        relations: ['user'],
      });
      const allApplications = [...jobApplications].map(data => {
        return { ...data, user: {} }
      }) as JobSearchEntity[];

      return allApplications;
    }
    catch (error) {
      console.error('Error fetching applications:', error);
      throw new InternalServerErrorException('Could not find applications');
    }
  }

  async addNewApplicationRow(applicationDetails: ApplicationDataDto): Promise<JobSearchEntity> {
    //TODO | NEXT>>: Add an option to differ between edit req and add req
    const newJobSearch = this.jobSearchRepository.create(<JobSearchEntity>{
      status: applicationDetails.status,
      companyName: applicationDetails.companyName,
      companyLocation: applicationDetails.companyLocation,
      positionType: applicationDetails.positionType,
      positionStack: applicationDetails.positionStack,
      applicationPlatform: applicationDetails.applicationPlatform,
      applicationDate: applicationDetails.applicationDate,
      notes: applicationDetails.notes,
      hunch: applicationDetails.hunch,
      user: { userId: applicationDetails.userId }, // Associate with an existing user
    });
    try {
      const applicationSaved = await this.jobSearchRepository.save(newJobSearch);
      return applicationSaved
    } catch (error) {
      console.error('Error saving application:', error);
      throw new InternalServerErrorException('Could not save application');
    }
  }

  async removeApplicationData(application: ApplicationDataDto): Promise<JobSearchEntity[]> {
    try {
      const deleteResult = await this.jobSearchRepository.delete({
        jobId: application.jobId,
        user: { userId: application.userId }
      });
      if (deleteResult.affected === 0) {
        throw new NotFoundException('Application not found or you do not have permission to delete it');
      }
      return await this.getApplications(application.userId);
    } catch (error) {
      console.error('Error deleting application:', error);
      throw new InternalServerErrorException('Could not delete application');
    }
  }
}