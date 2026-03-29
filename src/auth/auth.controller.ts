import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { HelperService } from './../services/helper.service';
import { AuthService } from './auth.service';
import { AuthorizedUserDto, PayloadUserDto, ValidatedLoginDto } from './dto/user/login-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private helperService: HelperService,
    private configService: ConfigService,
  ) { }

  //! TEMP FOR TESTING
  @Get('logintest')
  async logintest(@Body() userDto: any) {
    userDto = {
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
  async login(@Req() req: Request): Promise<ValidatedLoginDto> {
    if (req.user) {
      return <ValidatedLoginDto>await this.authService.tokenGenerator(req.user as PayloadUserDto);
    }
    const isUserValid = await this.authService.userValidation(req.body);
    if (isUserValid) {
      return <ValidatedLoginDto>await this.authService.tokenGenerator(req.body);
    }
    throw new UnauthorizedException();
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Req() req: Request): Promise<AuthorizedUserDto> {
    const token = this.helperService.tokenExtractor(req);
    return await this.authService.tokenVerification(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('signtoken')
  async sign(@Req() req: Request): Promise<ValidatedLoginDto | null> {
    const tokenObj = await this.authService.tokenGenerator(req.body);
    return !tokenObj ? null : tokenObj;
  }

  @UseGuards(JwtAuthGuard)
  @Post('openai')
  async getCredentials(@Req() req: Request): Promise<{ credential: string }> {
    const token = this.helperService.tokenExtractor(req);
    const verifiedUser = await this.authService.tokenVerification(token);
    if (!verifiedUser) {
      throw new UnauthorizedException();
    }
    const credential = await this.authService.openAiCredentials(verifiedUser);
    return { credential };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const token = await this.authService.googleLogin(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/login?google_token=${token}`);
  }
}
