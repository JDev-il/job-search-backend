import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../emails/email-intelligence.module';
import { JobSearchModule } from '../job-search/job-search.module';
import { PendingActionEntity } from './entities/pending-action.entity';
import { PendingActionsController } from './pending-actions.controller';
import { PendingActionsExecutor } from './services/pending-actions-executor.service';
import { PendingActionsReconciler } from './services/pending-actions-reconciler.service';
import { PendingActionsService } from './services/pending-actions.service';

@Module({
  imports: [TypeOrmModule.forFeature([PendingActionEntity]), JobSearchModule, EmailModule],
  controllers: [PendingActionsController],
  providers: [PendingActionsService, PendingActionsExecutor, PendingActionsReconciler],
  exports: [PendingActionsService],
})
export class PendingActionsModule { }
