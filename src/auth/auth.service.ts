// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRegistration } from '../users/entities/user.entity';
import { AuthorizedUserDto, LoginUserDto, UniqueUserDto } from './dto/user/login-user.dto';

@Injectable()
export class AuthService {
  private rawSecretKey!: string;

  constructor(
    @InjectRepository(UserRegistration)
    private usersRepository: Repository<UserRegistration>,
    private jwtService: JwtService, private configService: ConfigService) {
    this.rawSecretKey = this.configService.get<string>('JWT_SECRET_KEY');
  }


  async validateUser(loginUserDto: LoginUserDto): Promise<AuthorizedUserDto> {
    const { email, password } = loginUserDto;
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user && user.password === password) {
      return <AuthorizedUserDto>{ userId: user.user_id, email: user.email };
    }
    return null;
  }


  async userLogin(user: UniqueUserDto): Promise<AuthorizedUserDto | string> {
    const email = user.email;
    const userObj = await this.usersRepository.findOne({ where: { email } });
    if (userObj && user.auth_token) {
      const toVerify = <AuthorizedUserDto>{ userId: userObj.user_id, email: userObj.email, auth_token: user.auth_token }
      return this.verifyUserToken(toVerify);
    }
    else if (userObj && !user.auth_token) {
      const toGenerate = <AuthorizedUserDto>{ userId: userObj.user_id, email: userObj.email }
      return this.tokenGenerator(toGenerate);
    }
    else {
      throw new UnauthorizedException('Invalid credentials')
    }
  }


  async verifyUserToken(user: AuthorizedUserDto): Promise<AuthorizedUserDto> {
    const { email, userId } = user;
    const userPayload = { userId, email };
    const token = this.jwtService.sign(userPayload);
    return <AuthorizedUserDto>{
      auth_token: token,
      userId: user.userId,
      email: user.email,
    }
  }

  private async tokenGenerator(user: AuthorizedUserDto) {
    const { email, userId } = user;
    const userPayload = { userId, email };
    const token = this.jwtService.sign(userPayload);
    return token;
  }
}