import { Injectable } from '@nestjs/common';
import { NormalizedEmail, ParsedEmail } from './../interfaces/email.interface';

@Injectable()
export class EmailNormalizerService {
  normalize(email: ParsedEmail): NormalizedEmail {
    return {
      subject: this.clean(email.subject),
      bodyText: this.clean(email.bodyText),
      bodyCleaned: this.clean(this.stripQuotedReplies(email.bodyText)),
      snippet: email.snippet ? this.clean(email.snippet) : undefined,
      sender: email.sender,
      senderDomain: email.senderDomain,
    };
  }

  private clean(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private stripQuotedReplies(text: string): string {
    return text
      .split('\n')
      .filter((line) => !line.trim().startsWith('>'))
      .join(' ');
  }
}