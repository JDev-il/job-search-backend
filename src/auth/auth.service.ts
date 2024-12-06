// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { jwtConstants } from './constants';
import { AuthorizedUserDto, LoginUserDto, ValidatedLoginDto, VerifiedUserDto } from './dto/user/login-user.dto';
@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService
  ) { }

  async userLogin(loginUserDto: LoginUserDto): Promise<boolean> {
    return await this.userValidation(loginUserDto);
  }

  async tokenGenerator(user: AuthorizedUserDto & LoginUserDto): Promise<ValidatedLoginDto | null> {
    const payload = <VerifiedUserDto>{ email: user.email, password: user.password };
    const token = this.jwtService.sign(payload);
    return { email: user.email, auth_token: token }
  }

  async tokenVerification(token: string): Promise<AuthorizedUserDto> {
    const verifiedToken = await this.jwtService.verify(token, { secret: jwtConstants.secret });
    return verifiedToken;
  }


  public async userValidation(loginUser: LoginUserDto): Promise<boolean> {
    const { email, password } = <LoginUserDto>loginUser;
    try {
      const user = await this.usersRepository.findOne({ where: { email } });
      const passwordVerification = await bcrypt.compare(password, user.password);
      if (passwordVerification) {
        return true
      }
    } catch {
      throw new UnauthorizedException('User does not exist!');
    }
  }


}