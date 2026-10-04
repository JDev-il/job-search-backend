import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { HelperService } from './../services/helper.service';
import { AuthService } from './auth.service';
import { AuthorizedUserDto, LoginUserDto, ValidatedLoginDto } from './dto/user/login-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private helperService: HelperService,
    private configService: ConfigService,
  ) { }

  // No guard here on purpose: this route has to serve two cases (fresh
  // credentials, or "I already have a token, give me a refreshed one") and
  // a real JwtAuthGuard would reject the credentials case outright for
  // having no Authorization header. Both branches end in real verification —
  // either tokenVerification() against a signed JWT, or validateUser()'s
  // bcrypt check — so nothing here trusts the request body on its own.
  @Post('login')
  async login(@Req() req: Request): Promise<ValidatedLoginDto> {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = this.helperService.tokenExtractor(req);
      const verified = await this.authService.tokenVerification(token);
      return await this.authService.tokenGenerator({ userId: verified.userId, email: verified.email });
    }
    const { email, password } = req.body as LoginUserDto;
    const user = await this.authService.validateUser(email, password);
    return await this.authService.tokenGenerator({ userId: user.userId, email: user.email });
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Req() req: Request): Promise<AuthorizedUserDto> {
    const token = this.helperService.tokenExtractor(req);
    return await this.authService.tokenVerification(token);
  }

  // Used right after registration to mint the first token for a brand-new
  // account. Previously this signed whatever {userId, email} was in the
  // request body with no check at all — anyone could mint a valid token for
  // any userId. Now it goes through the same bcrypt-backed validateUser()
  // check as /login, so a token is only ever issued for credentials that
  // actually match.
  @Post('signtoken')
  async sign(@Req() req: Request): Promise<ValidatedLoginDto | null> {
    const { email, password } = req.body as LoginUserDto;
    const user = await this.authService.validateUser(email, password);
    const tokenObj = await this.authService.tokenGenerator({ userId: user.userId, email: user.email });
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
