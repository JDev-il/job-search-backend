import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// import { JwtStrategy } from './strategies/jwt.strategy';
import { HelperService } from '../services/helper.service';
import { TestingService } from '../temp/testing.service';
import { UserService } from '../users/users.service';
import { jwtConstants } from './constants';
import { ProtectedController } from './protected/protected.controller';
import { ProtectedService } from './protected/protected.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';



@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: "1d" },
      }),
    }),
    TypeOrmModule.forFeature([UserEntity]), // Register UserRegistration entity here
  ],
  providers: [AuthService, ProtectedService, TestingService, UserService, HelperService, JwtStrategy, LocalStrategy, GoogleStrategy], // Register LocalStrategy here
  controllers: [AuthController, ProtectedController],
})

export class AuthModule { }