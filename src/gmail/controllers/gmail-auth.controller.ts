import { Body, Controller, Delete, Get, Header, HttpCode, HttpException, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { GmailCallbackDto } from '../dto/gmail-callback.dto';
import { GmailAuthService } from '../services/gmail-auth.service';
import { GmailProcessingService } from '../services/gmail-processing.service';
import { GmailWatchService } from '../services/gmail-watch.service';

@Controller('auth/gmail')
export class GmailAuthController {
  constructor(
    private readonly gmailAuthService: GmailAuthService,
    private readonly gmailWatchService: GmailWatchService,
    private readonly processingService: GmailProcessingService,
  ) { }

  /**
   * Step 1: frontend calls this (with Bearer token) to get the OAuth URL,
   * then opens it in a popup window.
   */
  @UseGuards(JwtAuthGuard)
  @Get('url')
  getAuthUrl(@Req() req: Request): { url: string } {
    const userId = (req.user as { userId: number }).userId;
    return { url: this.gmailAuthService.getAuthUrl(userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('consent')
  recordConsent(@Body('accepted') accepted: boolean): { gmailConsent: boolean } {
    return { gmailConsent: !!accepted };
  }

  /**
   * Step 2: Google redirects here with a one-time `code` and the `state`
   * we set in step 1. Exchange the code for tokens and return an HTML page
   * that notifies the parent window and closes itself.
   */
  @Get('callback')
  @Header('Content-Type', 'text/html')
  async handleCallback(
    @Query() dto: GmailCallbackDto,
  ): Promise<string> {
    const userId = this.gmailAuthService.verifyStateToken(dto.state);
    const { gmailEmail } = await this.gmailAuthService.exchangeCodeForTokens(dto.code, userId);
    await this.gmailWatchService.registerWatch(userId, gmailEmail);
    return `<html><body><script>
      window.opener.postMessage({ type: 'gmail-connected', email: '${gmailEmail}' }, '*');
      window.close();
    </script></body></html>`;
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Req() req: Request): Promise<{ gmailEmail: string | null }> {
    const userId = (req.user as { userId: number }).userId;
    return this.gmailAuthService.getGmailStatus(userId);
  }

  /**
   * Opt-in catch-up of the last few days of mail, for after a (re)connect.
   * Starts in the background and answers at once; the results arrive as
   * proposals (GET /pending-actions), never as silent edits to the table.
   */
  @UseGuards(JwtAuthGuard)
  @Post('backfill')
  @HttpCode(202)
  async backfill(@Req() req: Request): Promise<{ status: 'started' }> {
    const userId = (req.user as { userId: number }).userId;
    // 409 GMAIL_RECONNECT_REQUIRED here, before anything starts, if Gmail isn't usable.
    await this.gmailAuthService.getValidToken(userId);
    if (!this.processingService.tryStartBackfill(userId)) {
      throw new HttpException('A backfill ran recently — try again in a few minutes', HttpStatus.TOO_MANY_REQUESTS);
    }
    return { status: 'started' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect')
  @HttpCode(204)
  async disconnect(@Req() req: Request): Promise<void> {
    const userId = (req.user as { userId: number }).userId;
    await this.gmailAuthService.disconnectGmail(userId);
  }
}
