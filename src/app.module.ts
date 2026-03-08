import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { JobSearchCriteriaEntity } from './job-search-criteria/entities/job-search-criteria.entity';
import { JobSearchCriteriaModule } from './job-search-criteria/job-search-criteria.module';
import { JobSearchEntity } from './job-search/entities/job-search.entity';
import { JobSearchModule } from './job-search/job-search.module';
import { MCPModule } from './mcp/mcp.module';
import { UserEntity } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // This makes ConfigModule available globally
    UsersModule,
    JobSearchModule,
    JobSearchCriteriaModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [UserEntity, JobSearchEntity, JobSearchCriteriaEntity],
        synchronize: true  // Set to false in production
      }),
    }),
    AuthModule,
    ApplicationsModule,
    MCPModule,
  ],
  controllers: [AppController],
  providers: [AppService]
})

export class AppModule { }