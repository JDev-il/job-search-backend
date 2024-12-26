import { BadRequestException, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApplicationDataDto } from '../auth/dto/data/application-data.dto';
import { JobSearchEntity } from './entities/job-search.entity';
import { JobSearchService } from './job-search.service';

@Controller('jobsearch')
export class JobSearchController {
  constructor(private readonly jobSearchService: JobSearchService) { }

  @Get('data')
  async getAllDataByUserID(@Query('user_id') user_id: string): Promise<JobSearchEntity[] | null> {
    return await this.jobSearchService.findApplicationData(+user_id) || null;
  }

  @Post('add')
  async addApplicationData(@Req() req: Request): Promise<void> {
    const data = req.body as ApplicationDataDto;
    if (!data.userId) {
      throw new BadRequestException('User ID is required');
    }
    await this.jobSearchService.addNewApplicationRow(data);
  }

  @Post('remove')
  async removeApplicationData(@Req() req: Request): Promise<void> {
    const data = req.body as ApplicationDataDto;
    if (!data.userId) {
      throw new BadRequestException('User ID is required');
    }
    await this.jobSearchService.removeApplicationData(data);
  }

  @Post('edit')
  async editApplicationData(@Req() req: Request): Promise<void> {
    const data = req.body as ApplicationDataDto;


    // const data = req.body as ApplicationDataDto;
    // if (!data.userId) {
    //   throw new BadRequestException('User ID is required');
    // }
    // await this.jobSearchService.addNewApplicationRow(data);
    return;
  }
}
