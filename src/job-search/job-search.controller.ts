import { BadRequestException, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApplicationDataDto } from '../auth/dto/data/application-data.dto';
import { JobSearchEntity } from './entities/job-search.entity';
import { JobSearchService } from './job-search.service';

@Controller('jobsearch')
export class JobSearchController {
  constructor(private readonly jobSearchService: JobSearchService) { }

  @Get('data')
  async getAllDataByUserID(@Query('user_id') user_id: string): Promise<JobSearchEntity[]> {
    return await this.jobSearchService.getApplications(+user_id) || null;
  }

  @Post('add')
  async addApplicationData(@Req() req: Request): Promise<void> {
    const data = req.body as ApplicationDataDto;
    if (!data.userId) {
      throw new BadRequestException('User ID is required');
    }
    await this.jobSearchService.addNewApplication(data);
  }

  @Post('update')
  async editApplicationData(@Req() req: Request): Promise<void> {
    if (!req.body.userId) {
      throw new BadRequestException('User ID is required');
    }
    await this.jobSearchService.updateApplication(req.body);
  }

  @Post('removemultiple')
  async removeApplicationsData(@Req() req: Request): Promise<JobSearchEntity[]> {
    const rawApplicationsData = req.body;
    const userId = req.body.userId;

    if (!rawApplicationsData || typeof rawApplicationsData !== 'object') {
      throw new BadRequestException('Invalid data format');
    }

    const applicationsArray = Object.values(rawApplicationsData).filter((entry) =>
      typeof entry === 'object' && 'jobId' in entry
    ) as ApplicationDataDto[];

    const mappedApplicationsArray = applicationsArray.map(application => {
      return <ApplicationDataDto>{
        ...application,
        userId: userId
      }
    })

    if (mappedApplicationsArray.length === 0) {
      throw new BadRequestException('No applications found for deletion');
    }

    return await this.jobSearchService.removeApplicationRows(mappedApplicationsArray);
  }
}
