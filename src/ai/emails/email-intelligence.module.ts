import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailClassificationService } from './services/email-classification.service';
import { EmailNormalizerService } from './services/email-normalize.service';

@Module({
  controllers: [EmailController],
  providers: [EmailClassificationService, EmailNormalizerService],
  exports: [EmailClassificationService, EmailNormalizerService],
})
export class EmailModule { }