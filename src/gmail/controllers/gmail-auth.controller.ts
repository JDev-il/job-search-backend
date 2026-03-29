import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { GmailCallbackDto } from '../dto/gmail-callback.dto';
import { GmailAuthService } from '../services/gmail-auth.service';
import { GmailWatchService } from '../services/gmail-watch.service';

@Controller('auth/gmail')
export class GmailAuthController {
  private readonly frontendUrl: string;

  constructor(
    private readonly gmailAuthService: GmailAuthService,
    private readonly gmailWatchService: GmailWatchService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL');
  }

  /**
   * Step 1: frontend calls this (with Bearer token) to get the OAuth URL,
   * then navigates to it via window.location.href.
   */
  @UseGuards(JwtAuthGuard)
  @Get('url')
  getAuthUrl(@Req() req: Request): { url: string } {
    const userId = (req.user as { userId: number }).userId;
    return { url: this.gmailAuthService.getAuthUrl(userId) };
  }

  /**
   * Step 2: Google redirects here with a one-time `code` and the `state`
   * we set in step 1. Exchange the code for tokens and redirect the user
   * back to the frontend.
   */
  @Get('callback')
  async handleCallback(
    @Query() dto: GmailCallbackDto,
    @Res() res: Response,
  ) {
    const userId = Number(dto.state);
    const { gmailEmail } = await this.gmailAuthService.exchangeCodeForTokens(dto.code, userId);
    await this.gmailWatchService.registerWatch(userId, gmailEmail);
    return res.redirect(`${this.frontendUrl}/settings?gmail=connected`);
  }
}
