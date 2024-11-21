import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ValidatedLoginDto } from './dto/user/login-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @UseGuards(JwtAuthGuard)
  @Post('login')
  async login(@Req() req: Request): Promise<ValidatedLoginDto> {
    const isUserValid = await this.authService.userValidation(req.body);
    if (isUserValid) {
      if (req.headers?.authorization) {
        return <ValidatedLoginDto>await this.tokenAuthenticator(req);
      }
      const newToken = <ValidatedLoginDto>await this.authService.tokenGenerator(req.body);
      return newToken;
    }
  }

  @Get('verify')
  async verify(@Req() req: Request) {
    if (req.headers?.authorization) {
      return await this.tokenAuthenticator(req);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('sign')
  async sign(@Req() req: Request): Promise<any> {
    const tokenObj = <ValidatedLoginDto>await this.authService.tokenGenerator(req.body) // returns type ValidatedLoginDto
    if (tokenObj) {
      return tokenObj;
    }
    return null;
  }


  private async tokenAuthenticator(req: Request) {
    const token = req.headers?.authorization.split(' ')[1];
    const verified = await this.authService.tokenVerification(token);
    if (verified) {
      return verified;
    }
  }
}
