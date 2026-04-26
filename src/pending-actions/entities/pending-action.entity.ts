import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobSearchEntity } from '../../job-search/entities/job-search.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PendingActionResolution, PendingActionType } from '../enums/pending-action.enum';
import {
  PendingActionEvidence,
  PendingActionProposedChange,
} from '../interfaces/pending-action.interface';

@Entity({ name: 'pending_actions', schema: 'public' })
@Index('uq_pending_action_user_message', ['userId', 'gmailMessageId'], { unique: true })
export class PendingActionEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'job_id', nullable: true })
  jobId: number | null;

  @Column({
    name: 'type',
    type: 'enum',
    enum: PendingActionType,
  })
  type: PendingActionType;

  @Column({ name: 'evidence', type: 'jsonb' })
  evidence: PendingActionEvidence;

  @Column({ name: 'proposed_change', type: 'jsonb' })
  proposedChange: PendingActionProposedChange;

  @Column({ name: 'question', type: 'text' })
  question: string;

  @Column({
    name: 'resolution',
    type: 'enum',
    enum: PendingActionResolution,
    default: PendingActionResolution.PENDING,
  })
  resolution: PendingActionResolution;

  @Column({ name: 'gmail_message_id' })
  gmailMessageId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => JobSearchEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'job_id' })
  job: JobSearchEntity | null;
}
