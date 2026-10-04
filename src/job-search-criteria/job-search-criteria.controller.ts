import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { JobSearchCriteriaEntity } from './entities/job-search-criteria.entity';
import { JobSearchCriteriaService } from './job-search-criteria.service';

interface AuthedRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('jobsearchcriteria')
@UseGuards(JwtAuthGuard)
export class JobSearchCriteriaController {
  constructor(private readonly jobSearchCriteriaService: JobSearchCriteriaService) { }

  @Get('criteria')
  async getJobSeaarchCriteria(@Req() req: AuthedRequest): Promise<JobSearchCriteriaEntity[]> {
    const criterias = await this.jobSearchCriteriaService.getJobCriteriaData(req.user.userId);
    return criterias;
  }
}
