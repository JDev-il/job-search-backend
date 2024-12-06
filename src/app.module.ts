import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { JobSearchEntity } from './job-search/entities/job-search.entity';
import { JobSearchModule } from './job-search/job-search.module';
import { UserEntity } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    UsersModule,
    JobSearchModule,
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
        entities: [UserEntity, JobSearchEntity],
        synchronize: false  // Set to false in production
      }),
    }),
    AuthModule,
    ApplicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService]
})

export class AppModule { }