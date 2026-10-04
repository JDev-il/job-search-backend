import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ClassifyEmailDto } from './dto/classify-email-dto';
import { EmailClassificationService } from './services/email-classification.service';

@Controller('emails')
export class EmailController {
  constructor(private readonly emailClassificationService: EmailClassificationService) { }

  // Was public and triggers a paid LLM call on the escalation path — open
  // to cost-abuse. The Gmail webhook flow calls EmailClassificationService
  // directly as an injected provider (gmail-processing.service.ts), not
  // through this HTTP route, so guarding the route doesn't touch that path.
  @UseGuards(JwtAuthGuard)
  @Post('classify')
  classify(@Body() dto: ClassifyEmailDto) {
    return this.emailClassificationService.classify(dto);
  }
}
