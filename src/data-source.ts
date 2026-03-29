import 'dotenv/config';
import { DataSource } from 'typeorm';
import { JobSearchCriteriaEntity } from './job-search-criteria/entities/job-search-criteria.entity';
import { JobSearchEntity } from './job-search/entities/job-search.entity';
import { UserEntity } from './users/entities/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [UserEntity, JobSearchEntity, JobSearchCriteriaEntity],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
