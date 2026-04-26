import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationDataDto } from '../auth/dto/data/application-data.dto';
import { ApplicationStatus } from '../applications/enums/application-status.enum';
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
    const application = this.jobSearchRepository.create({
      status: applicationDetails.status,
      companyName: applicationDetails.companyName,
      companyLocation: applicationDetails.companyLocation,
      companyCity: applicationDetails.companyCity,
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

  async findMatchingApplication(userId: number, companyName: string): Promise<JobSearchEntity | null> {
    return this.jobSearchRepository
      .createQueryBuilder('js')
      .where('js.user_id = :userId', { userId })
      .andWhere('LOWER(js.company_name) LIKE :pattern', { pattern: `%${companyName.toLowerCase()}%` })
      .andWhere('js.status NOT IN (:...excluded)', {
        excluded: [ApplicationStatus.REJECTED, ApplicationStatus.ARCHIVED],
      })
      .orderBy('js.application_applied_date', 'DESC')
      .limit(1)
      .getOne();
  }

  async createAutoApplication(
    userId: number,
    companyName: string,
    status: ApplicationStatus,
    gmailThreadId?: string,
  ): Promise<JobSearchEntity> {
    const application = this.jobSearchRepository.create({
      companyName,
      status,
      applicationDate: new Date(),
      isAutoCreated: true,
      gmailThreadId: gmailThreadId ?? null,
      user: { userId },
    });
    return this.jobSearchRepository.save(application);
  }

  async findByThreadId(userId: number, gmailThreadId: string): Promise<JobSearchEntity | null> {
    return this.jobSearchRepository
      .createQueryBuilder('js')
      .where('js.user_id = :userId', { userId })
      .andWhere('js.gmail_thread_id = :threadId', { threadId: gmailThreadId })
      .getOne();
  }

  async findById(userId: number, jobId: number): Promise<JobSearchEntity | null> {
    return this.jobSearchRepository.findOne({
      where: { jobId, user: { userId } },
      relations: ['user'],
    });
  }

  async setThreadId(userId: number, jobId: number, gmailThreadId: string): Promise<void> {
    await this.jobSearchRepository
      .createQueryBuilder()
      .update(JobSearchEntity)
      .set({ gmailThreadId })
      .where('job_id = :jobId AND user_id = :userId', { jobId, userId })
      .execute();
  }

  async setStatus(userId: number, jobId: number, status: ApplicationStatus): Promise<JobSearchEntity> {
    const application = await this.jobSearchRepository.findOne({
      where: { jobId, user: { userId } },
      relations: ['user'],
    });
    if (!application) {
      throw new NotFoundException('Application not found or you do not have permission to update it');
    }
    application.status = status;
    return this.jobSearchRepository.save(application);
  }

  /**
   * Recency-weighted candidates for LINK_THREAD_TO_APPLICATION. Returns up to
   * `limit` non-terminal applications ranked by token overlap against hints
   * (companyName, displayName, subject) plus a recency bonus.
   */
  async findLinkCandidates(
    userId: number,
    hints: { companyName?: string; senderDisplayName?: string; subject?: string },
    limit = 5,
  ): Promise<JobSearchEntity[]> {
    const apps = await this.jobSearchRepository
      .createQueryBuilder('js')
      .where('js.user_id = :userId', { userId })
      .andWhere('js.status NOT IN (:...excluded)', {
        excluded: [
          ApplicationStatus.REJECTED,
          ApplicationStatus.ARCHIVED,
          ApplicationStatus.CONTRACT_DECLINED,
          ApplicationStatus.CONTRACT_ACCEPTED,
          ApplicationStatus.DECIDED_TO_PASS,
          ApplicationStatus.LOW_SALARY,
          ApplicationStatus.DID_NOT_PASS_HR,
          ApplicationStatus.PROBABLY_NOT,
          ApplicationStatus.PASSED,
        ],
      })
      .orderBy('js.application_applied_date', 'DESC')
      .limit(50)
      .getMany();

    const tokens = new Set(
      [hints.companyName, hints.senderDisplayName, hints.subject]
        .filter((s): s is string => !!s)
        .flatMap(s => s.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3)),
    );

    const now = Date.now();
    const scored = apps.map(app => {
      const target = `${app.companyName ?? ''}`.toLowerCase();
      let overlap = 0;
      for (const t of tokens) {
        if (target.includes(t)) overlap += 1;
      }
      const ageDays = app.applicationDate
        ? (now - new Date(app.applicationDate).getTime()) / (1000 * 60 * 60 * 24)
        : 365;
      const recency = Math.max(0, 1 - ageDays / 90);
      return { app, score: overlap * 2 + recency };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.app);
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