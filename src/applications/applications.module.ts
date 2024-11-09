import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    UsersModule
  ],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule { }