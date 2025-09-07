import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'job_search_criteria', schema: 'public' })
export class JobSearchCriteriaEntity {
  @PrimaryGeneratedColumn({ name: 'criteria_id' })
  criteriaId: number;

  @ManyToOne(() => UserEntity, (user) => user.jobSearchCriteria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'location', nullable: true })
  location: string;

  @Column({ name: 'position_stack', type: 'text', array: true, nullable: true })
  positionStack: string[];

  @Column({ name: 'position_type', nullable: true })
  positionType: string;

  @Column({ name: 'min_years_experience', type: 'int', nullable: true })
  minYearsExperience: number;

  @Column({ name: 'max_years_experience', type: 'int', nullable: true })
  maxYearsExperience: number;

  @Column({ name: 'remote_only', type: 'boolean', nullable: true })
  remoteOnly: boolean;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
