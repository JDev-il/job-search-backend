import { Injectable, Logger } from '@nestjs/common';
import { HelperService } from '../../services/helper.service.js';
import { EMAIL_SIGNAL_RULES } from '../constants/email-signal-rules.ts';
import { EmailIntent, RuleField } from '../enums/email.enum';
import {
  EmailClassificationResult,
  EmailSignalRule,
  IntentSignalRule,
  ISignalRule,
  NormalizedEmail,
  ParsedEmail,
  RuleClassificationResult,
} from '../interfaces/email.interface';
import { EmailIntentMapper } from '../mapper/email-intent.mapper';
import { EmailLLMClassificationService } from './email-llm-classification.service';
import { EmailNormalizerService } from './email-normalize.service';

export const EMAIL_CLASSIFICATION_LLM_THRESHOLD = 0.7;

@Injectable()
export class EmailClassificationService {
  private readonly logger = new Logger(EmailClassificationService.name);

  constructor(
    private readonly normalizerService: EmailNormalizerService,
    private readonly llmService: EmailLLMClassificationService,
    private readonly mapper: EmailIntentMapper,
    private readonly helperService: HelperService
  ) { }

  public async classify(email: ParsedEmail): Promise<EmailClassificationResult> {
    const normalized = this.normalizerService.emailNormalizer(email);
    const ruleResult = this.runRules(normalized);
    const escalate = this.shouldEscalate(ruleResult);
    if (!escalate) {
      const result: EmailClassificationResult = {
        ...ruleResult,
        suggestedStatus: this.mapper.toApplicationStatus(ruleResult.intent),
      };
      this.logger.debug(
        `[Result] source = ${result.source}, intent = ${result.intent}, ` +
        `confidence = ${result.confidence.toFixed(3)}, suggestedStatus = "${result.suggestedStatus}"`,
      );
      return result;
    }

    const llmResult = await this.llmService.classify(normalized, ruleResult);
    this.logger.debug(
      `[LLM] intent = ${llmResult.intent}, confidence = ${llmResult.confidence.toFixed(3)}, ` +
      `suggestedStatus = "${llmResult.suggestedStatus}", reasoning = "${llmResult.reasoning}"`,
    );
    const statusIsValid = llmResult.suggestedStatus
      && this.mapper.isValidForIntent(llmResult.intent, llmResult.suggestedStatus);
    const validatedStatus = statusIsValid
      ? llmResult.suggestedStatus
      : this.mapper.toApplicationStatus(llmResult.intent);

    const result: EmailClassificationResult = {
      ...llmResult,
      suggestedStatus: validatedStatus,
    };
    return result;
  }

  // Email Rule engine
  private runRules(email: NormalizedEmail): RuleClassificationResult {
    const matchedRules: EmailSignalRule[] = [];
    const scores: IntentSignalRule = this.helperService.getEmailScores();

    for (const rule of EMAIL_SIGNAL_RULES) {
      const text = this.helperService.getFieldText(email, rule.field);
      if (text.includes(rule.phrase)) {
        scores[rule.intent] += rule.weight;
        matchedRules.push(rule);
      }
    }

    const { intent, confidence } = this.resolveRule(scores);
    return { intent, confidence, matchedRules, source: 'rules' };
  }

  // Escalation decision
  private shouldEscalate(result: RuleClassificationResult): boolean {
    if (result.matchedRules.length === 0) return true; // No signal at all from the rule engine
    else if (result.intent === EmailIntent.UNKNOWN) return true; // Rule engine gave up on determining an intent
    else if (result.confidence < EMAIL_CLASSIFICATION_LLM_THRESHOLD) return true; // Confidence too low, competing signals or ambiguous content
    else if (result.matchedRules.every(r => r.field === RuleField.SUBJECT)) return true; // Subject-only evidence is insufficient — rejection emails reuse confirmation subjects
    return false;
  }

  private resolveRule(scores: IntentSignalRule): ISignalRule {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topIntent, topScore] = sorted[0] as [EmailIntent, number];
    const [, secondScore] = (sorted[1] as [EmailIntent, number] | undefined) ?? [EmailIntent.UNKNOWN, 0];
    const confidence = topScore === 0 ? 0 : topScore / (topScore + secondScore);
    return {
      intent: topScore > 0 ? topIntent : EmailIntent.UNKNOWN,
      confidence,
    };
  }
}