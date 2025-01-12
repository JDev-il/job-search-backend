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

  async addNewApplication(applicationDetails: ApplicationDataDto): Promise<JobSearchEntity> {
    const application = this.jobSearchRepository.create(<JobSearchEntity>{
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
      const applicationSaved = await this.jobSearchRepository.save(application);
      return applicationSaved
    } catch (error) {
      console.error('Error saving application:', error);
      throw new InternalServerErrorException('Could not save application');
    }
  }

  async updateApplication(applicationDetails: ApplicationDataDto): Promise<JobSearchEntity> {
    try {
      const application = await this.jobSearchRepository.findOne({
        where: {
          jobId: applicationDetails.jobId,
          user: { userId: applicationDetails.userId },
        },
        relations: ['user'],
      });

      if (!application) {
        throw new NotFoundException('Application not found or you do not have permission to update it');
      }

      Object.assign(application, {
        status: applicationDetails.status,
        companyName: applicationDetails.companyName,
        companyLocation: applicationDetails.companyLocation,
        positionType: applicationDetails.positionType,
        positionStack: applicationDetails.positionStack,
        applicationPlatform: applicationDetails.applicationPlatform,
        applicationDate: applicationDetails.applicationDate,
        notes: applicationDetails.notes,
        hunch: applicationDetails.hunch,
      });

      return await this.jobSearchRepository.save(application);
    } catch (error) {
      console.error('Error updating application:', error);
      throw new InternalServerErrorException('Could not update application');
    }
  }

  async removeApplicationRows(applications: ApplicationDataDto[]): Promise<JobSearchEntity[]> {
    try {
      if (!applications || applications.length === 0) {
        throw new NotFoundException('No applications provided for deletion.');
      }
      const userId = applications[0].userId;
      const jobIds = applications.map(app => app.jobId);
      const query = this.jobSearchRepository
        .createQueryBuilder()
        .delete()
        .from(JobSearchEntity)
        .where('user_id = :userId', { userId })
        .andWhere('job_id IN (:...jobIds)', { jobIds });

      const deleteResult = await query.execute();
      if (deleteResult.affected === 0) {
        throw new NotFoundException('No matching applications found to delete.');
      }
      return await this.getApplications(userId);
    } catch (error) {
      console.error('Error deleting applications:', error);
      throw new InternalServerErrorException('Could not delete applications');
    }
  }
}