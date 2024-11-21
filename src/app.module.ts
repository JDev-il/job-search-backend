import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { JobSearch } from './job-search/entities/job-search.entity';
import { JobSearchController } from './job-search/job-search.controller';
import { JobSearchService } from './job-search/job-search.service';
import { UserRegistrationEntity } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true }), // This makes ConfigModule available globally
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [UserRegistrationEntity, JobSearch],
        synchronize: false,  // Set to false in production
      }),
    }),
    AuthModule,
    ApplicationsModule,
  ],
  controllers: [AppController, JobSearchController],
  providers: [AppService, JobSearchService]
})

export class AppModule { }