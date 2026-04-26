import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../emails/email-intelligence.module';
import { JobSearchModule } from '../job-search/job-search.module';
import { PendingActionEntity } from './entities/pending-action.entity';
import { PendingActionsController } from './pending-actions.controller';
import { PendingActionsExecutor } from './services/pending-actions-executor.service';
import { PendingActionsService } from './services/pending-actions.service';

@Module({
  imports: [TypeOrmModule.forFeature([PendingActionEntity]), JobSearchModule, EmailModule],
  controllers: [PendingActionsController],
  providers: [PendingActionsService, PendingActionsExecutor],
  exports: [PendingActionsService],
})
export class PendingActionsModule { }
