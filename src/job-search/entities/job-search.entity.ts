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

  @Column({ name: 'position_stack' })
  positionStack: string;

  @Column({ name: 'application_platform' })
  applicationPlatform: string;

  @Column({ name: 'application_date', type: 'date' }) // Ensure correct type
  applicationDate: Date;

  @Column({ name: 'notes', nullable: true }) // Allow null if not always provided
  notes: string;

  @Column({ name: 'hunch', nullable: true }) // Allow null if not always provided
  hunch: string;

  // Many-to-One relation with User
  @ManyToOne(() => UserEntity, (user) => user.jobSearchData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // Foreign key column name
  user: UserEntity;

  @Column({ name: 'user_created_at', type: 'timestamp', nullable: true }) // Regular timestamp column
  userCreatedAt: Date;
}