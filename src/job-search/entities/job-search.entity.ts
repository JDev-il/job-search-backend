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

  @Column({ name: 'company_location' })
  companyLocation: string;

  @Column({ name: 'position_type' })
  positionType: string;

  @Column({ name: 'position_stack', type: 'text', array: true })
  positionStack: string[];

  @Column({ name: 'application_platform' })
  applicationPlatform: string;

  @Column({ name: 'application_applied_date', type: 'date' })
  applicationDate: Date;

  @Column({ name: 'notes', nullable: true })
  notes: string;

  @Column({ name: 'hunch', nullable: true })
  hunch: string;

  @ManyToOne(() => UserEntity, (user) => user.jobSearchData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // Reference the correct column
  user: UserEntity;
}