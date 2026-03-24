export enum EmailStatus {
  CONFIRMATION = 'confirmation',
  REJECTION = 'rejection',
  INTERVIEW = 'interview',
  ASSESSMENT = 'assessment',
  FOLLOW_UP = 'follow_up',
  UNKNOWN = 'unknown',
}

export enum RuleField {
  SUBJECT = 'subject',
  BODY = 'body',
  BODY_CLEANED = 'body_cleaned',
};
export enum RuleStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong'
};