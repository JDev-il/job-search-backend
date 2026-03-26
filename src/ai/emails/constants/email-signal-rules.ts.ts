import { EmailIntent, RuleField, RuleStrength } from '../enums/email.enum';
import { EmailSignalRule } from '../interfaces/email.interface';

export const EMAIL_SIGNAL_RULES: EmailSignalRule[] = [

  // ======================
  // CONFIRMATION (SUBJECT - STRONG)
  // ======================

  {
    phrase: 'thank you for your application',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 6,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'thank you for applying to',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 6,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'thank you for applying for',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 6,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'thanks for applying',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 5,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'application received',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 6,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'we received your application',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.SUBJECT,
    weight: 6,
    strength: RuleStrength.STRONG,
  },

  // ======================
  // CONFIRMATION (BODY - WEAKER)
  // ======================

  {
    phrase: 'thank you for submitting your application',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.BODY,
    weight: 2,
    strength: RuleStrength.WEAK,
  },
  {
    phrase: 'we have received your application',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.BODY,
    weight: 3,
    strength: RuleStrength.WEAK,
  },
  {
    phrase: 'our team will review your application',
    intent: EmailIntent.CONFIRMATION,
    field: RuleField.BODY,
    weight: 2,
    strength: RuleStrength.WEAK,
  },

  // ======================
  // REJECTION (BODY - STRONG)
  // ======================

  {
    phrase: 'after careful consideration',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 7,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'after reviewing your experience',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 5,
    strength: RuleStrength.MEDIUM,
  },
  {
    phrase: 'we decided to move forward with other candidates',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 9,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'we will not be moving forward',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 9,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'we are unable to move forward',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 8,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'we regret to inform you',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 8,
    strength: RuleStrength.STRONG,
  },

  // ======================
  // REJECTION (BODY - SUPPORTING SIGNALS)
  // ======================

  {
    phrase: 'thank you for your interest in',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 3,
    strength: RuleStrength.WEAK,
  },
  {
    phrase: 'thank you for submitting your resume',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 3,
    strength: RuleStrength.WEAK,
  },
  {
    phrase: 'we wish you the best in your job search',
    intent: EmailIntent.REJECTION,
    field: RuleField.BODY,
    weight: 4,
    strength: RuleStrength.MEDIUM,
  },

  // ======================
  // INTERVIEW
  // ======================

  {
    phrase: 'we would like to schedule an interview',
    intent: EmailIntent.INTERVIEW,
    field: RuleField.BODY,
    weight: 8,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'invite you to interview',
    intent: EmailIntent.INTERVIEW,
    field: RuleField.BODY,
    weight: 8,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'are you available for an interview',
    intent: EmailIntent.INTERVIEW,
    field: RuleField.BODY,
    weight: 7,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'schedule a call',
    intent: EmailIntent.INTERVIEW,
    field: RuleField.BODY,
    weight: 5,
    strength: RuleStrength.MEDIUM,
  },

  // ======================
  // ASSESSMENT
  // ======================

  {
    phrase: 'technical assessment',
    intent: EmailIntent.ASSESSMENT,
    field: RuleField.BODY,
    weight: 7,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'coding challenge',
    intent: EmailIntent.ASSESSMENT,
    field: RuleField.BODY,
    weight: 7,
    strength: RuleStrength.STRONG,
  },
  {
    phrase: 'complete the following assignment',
    intent: EmailIntent.ASSESSMENT,
    field: RuleField.BODY,
    weight: 8,
    strength: RuleStrength.STRONG,
  },

  // ======================
  // FOLLOW-UP
  // ======================

  {
    phrase: 'just following up',
    intent: EmailIntent.FOLLOW_UP,
    field: RuleField.BODY,
    weight: 6,
    strength: RuleStrength.MEDIUM,
  },
  {
    phrase: 'wanted to follow up',
    intent: EmailIntent.FOLLOW_UP,
    field: RuleField.BODY,
    weight: 6,
    strength: RuleStrength.MEDIUM,
  },
  {
    phrase: 'checking in regarding',
    intent: EmailIntent.FOLLOW_UP,
    field: RuleField.BODY,
    weight: 5,
    strength: RuleStrength.MEDIUM,
  },
];