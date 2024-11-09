import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('job_search') // Table name is 'job_search'
export class JobSearch {
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

  @Column({ name: 'application_date', type: 'date' })
  applicationDate: Date;

  @Column({ name: 'notes', nullable: true })
  notes: string;

  @Column({ name: 'hunch', nullable: true })
  hunch: string;

  // Many-to-One relation with User
  @ManyToOne(() => User, (user) => user.jobSearhData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // Foreign key column name
  user: User;
}