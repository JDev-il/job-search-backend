import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthorizedUserDto, ValidatedLoginDto } from './dto/user/login-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @UseGuards(JwtAuthGuard)
  @Post('login')
  async login(@Req() req: Request): Promise<ValidatedLoginDto | null> {
    const isUserValid = await this.authService.userValidation(req.body);
    if (isUserValid) {
      if (req.headers?.authorization) {
        return <ValidatedLoginDto>await this.tokenAuthenticator(req);
      }
      return <ValidatedLoginDto>await this.authService.tokenGenerator(req.body);
    }
    return null;
  }

  @Get('verify')
  async verify(@Req() req: Request): Promise<AuthorizedUserDto | null> {
    return req.headers?.authorization ? await this.tokenAuthenticator(req) : null
  }

  @UseGuards(JwtAuthGuard)
  @Post('signtoken')
  async sign(@Req() req: Request): Promise<ValidatedLoginDto | null> {
    const tokenObj = await this.authService.tokenGenerator(req.body);
    return !tokenObj ? null : tokenObj;
  }


  private async tokenAuthenticator(req: Request): Promise<AuthorizedUserDto | null> {
    const token = req.headers?.authorization.split(' ')[1];
    const verified = await this.authService.tokenVerification(token);
    return !verified ? null : verified;
  }
}
