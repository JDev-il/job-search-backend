import { EmailStatus, RuleField, RuleStrength } from '../enums/email.enum';
import { EmailSignalRule } from '../interfaces/email.interface';

export const EMAIL_SIGNAL_RULES: EmailSignalRule[] = [
  // CONFIRMATION
  {
    phrase: 'thank you for your application',
    intent: EmailStatus.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 6,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'thank you for applying to',
    intent: EmailStatus.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 6,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'we got it',
    intent: EmailStatus.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 5,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'thank you for your application',
    intent: EmailStatus.CONFIRMATION,
    field: RuleField.BODY,
    weight: 2,
    strength: RuleStrength.WEAK,
  },
  // REJECTION
  {
    phrase: 'after reviewing your experience',
    intent: EmailStatus.REJECTION,
    field: RuleField.BODY,
    weight: 5,
    strength: RuleStrength.MEDIUM,
  },
  {
    phrase: 'after careful consideration',
    intent: EmailStatus.REJECTION,
    field: RuleField.BODY,
    weight: 7,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'move forward with other candidates',
    intent: EmailStatus.REJECTION,
    field: RuleField.BODY,
    weight: 9,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'we will not be moving forward',
    intent: EmailStatus.REJECTION,
    field: RuleField.BODY,
    weight: 9,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'thank you for your interest in',
    intent: EmailStatus.REJECTION,
    field: RuleField.BODY,
    weight: 3,
    strength: RuleStrength.WEAK,
  },
];