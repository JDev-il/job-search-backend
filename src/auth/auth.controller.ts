import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
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

  @UseGuards(JwtAuthGuard)
  @Post('login')
  async login(@Req() req: Request): Promise<ValidatedLoginDto> {
    if (req.user) {
      return await this.authService.tokenGenerator(req.user as PayloadUserDto);
    }
    const user = await this.authService.validateUser(req.body.email, req.body.password);
    return await this.authService.tokenGenerator({ userId: user.userId, email: user.email });
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
    return tokenObj ?? null;
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
