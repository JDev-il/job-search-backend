// user.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JobSearch } from '../../job-search/entities/job-search.entity';

@Entity({ name: 'users', schema: 'public' })
export class UserRegistration {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ name: 'first_name' })
  firstname: string;

  @Column({ name: 'last_name' })
  lastname: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
  // One-to-Many relationship with JobSearch
  @OneToMany(() => JobSearch, (jobSearch) => jobSearch.user)
  jobSearhData: JobSearch[];
}

@Entity()
export class UserLogin {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // Important: Store hashed passwords in production
}