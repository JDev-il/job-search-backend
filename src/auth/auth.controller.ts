import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { HelperService } from './../services/helper.service';
import { AuthService } from './auth.service';
import { AuthorizedUserDto, ValidatedLoginDto } from './dto/user/login-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private helperService: HelperService) { }

  //! TEMP FOR TESTING
  @Get('logintest')
  async logintest(@Body() userDto: any) {
    userDto = <unknown>{
      email: 'jdev@gmail.com',
      password: 'jdev2025'
    }
    const user = await this.authService.validateUser(userDto.email, userDto.password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.authService.generateToken(user);
  }
  //! TEMP FOR TESTING

  @UseGuards(JwtAuthGuard)
  @Post('login')
  async login(@Req() req: Request): Promise<ValidatedLoginDto | UnauthorizedException> {
    const isUserValid = await this.authService.userValidation(req.body);
    if (isUserValid) {
      return <ValidatedLoginDto>await this.authService.tokenGenerator(req.body);
    }
    return new UnauthorizedException
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Req() req: Request): Promise<AuthorizedUserDto> {
    if (req.headers.authorization) {
      const token = this.helperService.tokenExtractor(req);
      return await this.authService.tokenVerification(token);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('signtoken')
  async sign(@Req() req: Request): Promise<ValidatedLoginDto | null> {
    const tokenObj = await this.authService.tokenGenerator(req.body);
    return !tokenObj ? null : tokenObj;
  }


  //! TEMP FOR TESTING
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
  // Initiates Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    return this.authService.googleLogin(req.user); // Calls googleLogin from AuthService
  }
  //! TEMP FOR TESTING
}
