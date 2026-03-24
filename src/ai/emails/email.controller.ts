import { Body, Controller, Post } from '@nestjs/common';
import { ClassifyEmailDto } from './dto/classify-email-dto';
import { EmailClassificationService } from './services/email-classification.service';
import { EmailNormalizerService } from './services/email-normalize.service';

@Controller('emails')
export class EmailController {
  constructor(
    private emailClassificationService: EmailClassificationService,
    private emailNormalizerService: EmailNormalizerService,
  ) { }

  @Post('classify')
  classify(@Body() dto: ClassifyEmailDto) {
    const normalized = this.emailNormalizerService.normalize(dto);
    return this.emailClassificationService.classify(normalized);
  }
}