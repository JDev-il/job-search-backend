import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: "email" })
  }

  // async validate(email: string, password: string): Promise<AuthorizedUserDto> {
  //   const userToValidate = { email, password };
  //   const user = await this.authService.validateUser(userToValidate);
  //   if (!user) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }
  //   return user;
  // }
}