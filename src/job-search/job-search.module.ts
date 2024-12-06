import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSearchEntity } from './entities/job-search.entity';
import { JobSearchController } from './job-search.controller';
import { JobSearchService } from './job-search.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobSearchEntity]), HttpModule, ConfigModule],
  controllers: [JobSearchController],
  providers: [JobSearchService],
  exports: [JobSearchService],
})
export class JobSearchModule {}
