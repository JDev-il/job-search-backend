import { Injectable } from '@nestjs/common';
import { HelperService } from '../../services/helper.service';
import { NormalizedEmail, ParsedEmail } from './../interfaces/email.interface';

@Injectable()
export class EmailNormalizerService {

  constructor(private helperService: HelperService) { }

  public emailNormalizer(email: ParsedEmail): NormalizedEmail {
    return {
      subject: this.helperService.textCleaner(email.subject),
      bodyText: this.helperService.textCleaner(email.bodyText),
      bodyCleaned: this.helperService.textCleaner(this.stripReplies(email.bodyText)),
      snippet: email.snippet ? this.helperService.textCleaner(email.snippet) : undefined,
      sender: email.sender,
      senderDomain: email.senderDomain,
    };
  }

  private stripReplies(text: string): string {
    return text
      .split('\n')
      .filter((line) => !line.trim().startsWith('>'))
      .join(' ');
  }
}