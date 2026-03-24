import { Injectable } from '@nestjs/common';
import { EMAIL_SIGNAL_RULES } from '../constants/email-signal-rules.ts';
import { EmailStatus, RuleField } from '../enums/email.enum';
import { EmailClassificationResult, EmailSignalRule, IntentSignalRule, NormalizedEmail } from './../interfaces/email.interface';

@Injectable()
export class EmailClassificationService {
  classify(email: NormalizedEmail): EmailClassificationResult {
    const matchedRules: EmailSignalRule[] = [];
    const scores: IntentSignalRule = {
      [EmailStatus.CONFIRMATION]: 0,
      [EmailStatus.REJECTION]: 0,
      [EmailStatus.INTERVIEW]: 0,
      [EmailStatus.ASSESSMENT]: 0,
      [EmailStatus.FOLLOW_UP]: 0,
      [EmailStatus.UNKNOWN]: 0,
    };
    const { intent, confidence } = this.resolve(scores);
    for (const rule of EMAIL_SIGNAL_RULES) {
      const text = this.getFieldText(email, rule.field);
      if (text.includes(rule.phrase)) {
        scores[rule.intent] += rule.weight;
        matchedRules.push(rule);
      }
    }
    console.log({
      intent,
      confidence,
      matchedRules,
      source: 'rules' as const
    });

    return {
      intent,
      confidence,
      matchedRules,
      source: 'rules' as const,
    };
  }

  private getFieldText(email: NormalizedEmail, field: RuleField): string {
    switch (field) {
      case RuleField.SUBJECT:
        return email.subject;
      case RuleField.BODY:
        return email.bodyText;
      case RuleField.BODY_CLEANED:
        return email.bodyCleaned;
      default:
        return '';
    }
  }

  private resolve(scores: IntentSignalRule) {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    const [topIntent, topScore] = sorted[0] as [EmailStatus, number];
    const [, secondScore] = (sorted[1] as [EmailStatus, number] | undefined) ?? [EmailStatus.UNKNOWN, 0];
    const confidence = topScore === 0 ? 0 : topScore / (topScore + secondScore);

    return {
      intent: topScore > 0 ? topIntent : EmailStatus.UNKNOWN,
      confidence,
    };
  }
}