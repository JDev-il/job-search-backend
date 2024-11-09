import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

  @Get()
  findAll(): Promise<Application[]> {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<Application> {
    return this.applicationsService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Application>): Promise<Application> {
    return this.applicationsService.createApplication(data);
  }

  @Delete(':id')
  delete(@Param('id') id: number): Promise<void> {
    return this.applicationsService.deleteApplication(id);
  }
}