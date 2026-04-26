import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'job_search', schema: 'public' })
export class JobSearchEntity {
  @PrimaryGeneratedColumn({ name: 'job_id' })
  jobId: number;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ name: 'company_location', nullable: true })
  companyLocation: string | null;

  @Column({ name: 'company_city', nullable: true })
  companyCity: string | null;

  @Column({ name: 'position_type', nullable: true })
  positionType: string | null;

  @Column({ name: 'position_stack', type: 'text', array: true, nullable: true })
  positionStack: string[] | null;

  @Column({ name: 'application_platform', nullable: true })
  applicationPlatform: string | null;

  @Column({ name: 'application_applied_date', type: 'date' })
  applicationDate: Date;

  @Column({ name: 'is_auto_created', default: false })
  isAutoCreated: boolean;

  @Column({ name: 'gmail_thread_id', nullable: true })
  gmailThreadId: string | null;

  @Column({ name: 'notes', nullable: true })
  notes: string;

  @Column({ name: 'hunch', nullable: true })
  hunch: string;

  @ManyToOne(() => UserEntity, (user) => user.jobSearchData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // Reference the correct column
  user: UserEntity;
}