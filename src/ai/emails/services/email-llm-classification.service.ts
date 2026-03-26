import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '../../../applications/enums/application-status.enum';
import { OpenAIService } from '../../../mcp/openai/openai.service';
import { EmailIntent } from '../enums/email.enum';
import { IRoleType, LLMClassificationResult, LLMRawEmailResponse, NormalizedEmail, RuleClassificationResult } from '../interfaces/email.interface';

const VALID_INTENTS = new Set<string>(Object.values(EmailIntent));
const VALID_STATUSES = new Set<string>(Object.values(ApplicationStatus));

@Injectable()
export class EmailLLMClassificationService {

  constructor(private readonly openaiService: OpenAIService) { }

  public async classify(email: NormalizedEmail, ruleResult: RuleClassificationResult,): Promise<LLMClassificationResult> {
    const messages = this.messagesBuilder(email, ruleResult);
    const raw = await this.openaiService.askStructured<LLMRawEmailResponse>(messages);
    return this.parseResponse(raw);
  }

  private messagesBuilder(email: NormalizedEmail, ruleResult: RuleClassificationResult): IRoleType[] {
    const matchedPhrases = ruleResult.matchedRules.map((res) => `"${res.phrase}"`).join(', ') || 'none';
    return [
      {
        role: 'system',
        content:
          `
            You are an email classification assistant for a job search tracking application. Classify the provided job-related email and return a JSON object with exactly these fields:
            - "intent": one of [${Object.values(EmailIntent).join(', ')}]
            - "confidence": number between 0 and 1 representing your certainty
            - "suggestedStatus": (optional) the most specific status for this email, chosen from:
              [${Object.values(ApplicationStatus).map((v) => `"${v}"`).join(', ')}]
              Omit this field if you are not confident enough to suggest a specific status.
            - "reasoning": brief one-sentence explanation of your classification

            Return only valid JSON. Do not include any other text.
          `,
      },
      {
        role: 'user',
        content:
          `
            Email to classify:
              Subject: ${email.subject}
              Sender: ${email.sender}${email.senderDomain ? ` (${email.senderDomain})` : ''}
              Body: ${email.bodyCleaned ?? email.bodyText}

              Rule engine context (low confidence, escalated for LLM review):
              - Detected intent: ${ruleResult.intent}
              - Rule confidence: ${ruleResult.confidence.toFixed(2)}
              - Matched phrases: ${matchedPhrases}
          `,
      },
    ];
  }

  private parseResponse(raw: LLMRawEmailResponse): LLMClassificationResult {
    const intent = VALID_INTENTS.has(raw.intent)
      ? (raw.intent as EmailIntent)
      : EmailIntent.UNKNOWN;

    const confidence =
      (typeof raw.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1)
        ? raw.confidence
        : 0;

    const suggestedStatus =
      (raw.suggestedStatus && VALID_STATUSES.has(raw.suggestedStatus))
        ? (raw.suggestedStatus as ApplicationStatus)
        : undefined;

    return {
      intent,
      confidence,
      suggestedStatus,
      reasoning: raw.reasoning,
      source: 'llm',
    };
  }
}
