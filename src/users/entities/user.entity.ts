import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JobSearchCriteriaEntity } from '../../job-search-criteria/entities/job-search-criteria.entity';
import { JobSearchEntity } from '../../job-search/entities/job-search.entity';

@Entity({ name: 'users', schema: 'public' })
export class UserEntity {
  @PrimaryGeneratedColumn({ name: 'user_id' })
  userId: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'password' })
  @Exclude()
  password: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'gmail_access_token', nullable: true })
  gmailAccessToken: string | null;

  @Column({ name: 'gmail_refresh_token', nullable: true })
  gmailRefreshToken: string | null;

  @Column({ name: 'gmail_token_expiry', type: 'timestamp', nullable: true })
  gmailTokenExpiry: Date | null;

  @Column({ name: 'gmail_history_id', nullable: true })
  gmailHistoryId: string | null;

  @Column({ name: 'gmail_email', nullable: true })
  gmailEmail: string | null;

  @Column({ name: 'google_id', nullable: true })
  googleId: string | null;

  @OneToMany(() => JobSearchEntity, (jobSearch) => jobSearch.user)
  jobSearchData: JobSearchEntity[];
  // ADD THIS SECTION:
  @OneToMany(() => JobSearchCriteriaEntity, (criteria) => criteria.user)
  jobSearchCriteria: JobSearchCriteriaEntity[];
}