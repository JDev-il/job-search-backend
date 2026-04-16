import { Body, Controller, Post } from '@nestjs/common';
import { ClassifyEmailDto } from './dto/classify-email-dto';
import { EmailClassificationService } from './services/email-classification.service';

@Controller('emails')
export class EmailController {
  constructor(private readonly emailClassificationService: EmailClassificationService) { }

  @Post('classify')
  classify(@Body() dto: ClassifyEmailDto) {
    return this.emailClassificationService.classify(dto);
  }
}
