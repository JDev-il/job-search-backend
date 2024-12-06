import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { JobSearchEntity } from './entities/job-search.entity';
import { JobSearchService } from './job-search.service';

@Controller('jobsearch')
export class JobSearchController {
  constructor(private readonly jobSearchService: JobSearchService) { }

  @Get('data')
  async getAllDataByUserID(@Query('user_id') user_id: string): Promise<JobSearchEntity[] | null> {
    return await this.jobSearchService.findUserData(+user_id) || null;
  }

  @Post('add')
  async addApplicationData(@Req() req: Request): Promise<any> {
    //! Partial process - move on to phase 2 of job-serach-implementation
    return;
  }
}
