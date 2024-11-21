import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRegistrationEntity } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// import { JwtStrategy } from './strategies/jwt.strategy';
import { jwtConstants } from './constants';
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
    TypeOrmModule.forFeature([UserRegistrationEntity]), // Register UserRegistration entity here
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy], // Register LocalStrategy here
  controllers: [AuthController],
})

export class AuthModule { }