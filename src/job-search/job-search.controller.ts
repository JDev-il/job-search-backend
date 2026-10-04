import { BadRequestException, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApplicationDataDto } from '../auth/dto/data/application-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { JobSearchEntity } from './entities/job-search.entity';
import { JobSearchService } from './job-search.service';

interface AuthedRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('jobsearch')
@UseGuards(JwtAuthGuard)
export class JobSearchController {
  constructor(private readonly jobSearchService: JobSearchService) { }

  // userId now always comes from the verified JWT (req.user), never from a
  // query param or request body — those were previously trusted as-is,
  // which let any caller read, write or delete any other user's rows just
  // by passing a different user_id/userId.
  @Get('data')
  async getAllDataByUserID(@Req() req: AuthedRequest): Promise<JobSearchEntity[]> {
    return await this.jobSearchService.getApplications(req.user.userId) || null;
  }

  @Post('add')
  async addApplicationData(@Req() req: AuthedRequest): Promise<void> {
    const data = { ...(req.body as ApplicationDataDto), userId: req.user.userId };
    await this.jobSearchService.addNewApplication(data);
  }

  @Post('update')
  async editApplicationData(@Req() req: AuthedRequest): Promise<void> {
    const data = { ...(req.body as ApplicationDataDto), userId: req.user.userId };
    await this.jobSearchService.updateApplication(data);
  }

  @Post('removemultiple')
  async removeApplicationsData(@Req() req: AuthedRequest): Promise<JobSearchEntity[]> {
    const rawApplicationsData = req.body;
    const userId = req.user.userId;

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
