import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSearch } from '../job-search/entities/job-search.entity';
import { UserRegistrationEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UserService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRegistrationEntity, JobSearch]), HttpModule,       // Needed for httpService
    ConfigModule],
  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule { }
