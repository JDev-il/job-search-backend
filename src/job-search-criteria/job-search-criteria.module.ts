import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSearchCriteriaEntity } from './entities/job-search-criteria.entity';
import { JobSearchCriteriaController } from './job-search-criteria.controller';
import { JobSearchCriteriaService } from './job-search-criteria.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobSearchCriteriaEntity]), HttpModule, ConfigModule],
  controllers: [JobSearchCriteriaController],
  providers: [JobSearchCriteriaService],
  exports: [JobSearchCriteriaService],
})
export class JobSearchCriteriaModule { }
