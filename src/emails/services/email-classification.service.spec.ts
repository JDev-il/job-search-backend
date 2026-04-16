import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, it } from 'node:test';
import { ApplicationStatus } from '../../applications/enums/application-status.enum';
import { HelperService } from '../../services/helper.service';
import { EmailIntent } from '../enums/email.enum';
import { LLMClassificationResult } from '../interfaces/email.interface';
import { EmailIntentMapper } from '../mapper/email-intent.mapper';
import { EMAIL_CLASSIFICATION_LLM_THRESHOLD, EmailClassificationService } from './email-classification.service';
import { EmailLLMClassificationService } from './email-llm-classification.service';
import { EmailNormalizerService } from './email-normalize.service';

// ---------------------------------------------------------------------------
// Test matrix, real-like email samples
// Each case documents expected rule scores so the intent is transparent.
// ---------------------------------------------------------------------------

const SAMPLES = {
  /**
   * Strong confirmation
   * Subject matches: "application received" (SUBJECT, CONFIRMATION, w=6)
   * Body matches:    "we have received your application" (BODY, w=3)
   *                  "our team will review your application" (BODY, w=2)
   * → CONFIRMATION score=11, all others=0, confidence=1.0 → rules only
   */
  strongConfirmation: {
    subject: 'Application Received',
    bodyText:
      'We have received your application. Our team will review your application and get back to you shortly.',
    sender: 'careers@acme.com',
  },

  /**
   * Strong rejection
   * Body matches: "after careful consideration" (BODY, REJECTION, w=7)
   *               "we will not be moving forward" (BODY, REJECTION, w=9)
   * → REJECTION score=16, confidence=1.0 → rules only
   */
  strongRejection: {
    subject: 'Re: Your Application',
    bodyText:
      'After careful consideration, we will not be moving forward with your application at this time. We wish you the best in your search.',
    sender: 'noreply@bigcorp.com',
  },

  /**
   * Ambiguous, competing signals
   * Body matches: "thank you for your interest in" (BODY, REJECTION, w=3)
   *               "schedule a call"                (BODY, INTERVIEW,  w=5)
   * → REJECTION=3, INTERVIEW=5, confidence=5/8=0.625, below threshold → escalates to LLM
   */
  ambiguousPolite: {
    subject: 'Following up on your application',
    bodyText:
      'Thank you for your interest in our company. We would like to schedule a call to discuss your background further.',
    sender: 'recruiter@startup.io',
  },

  /**
   * Interview invite
   * Body matches: "we would like to schedule an interview" (BODY, INTERVIEW, w=8)
   * → INTERVIEW score=8, confidence=1.0 → rules only
   */
  interviewInvite: {
    subject: 'Interview Invitation – Software Engineer',
    bodyText:
      'We would like to schedule an interview with you for the Software Engineer role. Please let us know your availability this week.',
    sender: 'hr@techco.com',
  },

  /**
   * Assessment request
   * Body matches: "complete the following assignment" (BODY, ASSESSMENT, w=8)
   * → ASSESSMENT score=8, confidence=1.0 → rules only
   */
  assessmentRequest: {
    subject: 'Technical Assessment – Next Steps',
    bodyText:
      'As part of our hiring process, we would like you to complete the following assignment. Please submit your solution within 5 days.',
    sender: 'engineering@corp.com',
  },

  /**
   * Irrelevant noise, no job-related phrases
   * → 0 rules matched → escalates to LLM
   */
  irrelevantNoise: {
    subject: 'Your package has been shipped',
    bodyText:
      'Your order #12345 has been dispatched. Expected delivery: Friday. Track your shipment at the link below.',
    sender: 'noreply@shop.com',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLlmResult(overrides: Partial<LLMClassificationResult> = {}): LLMClassificationResult {
  return {
    intent: EmailIntent.UNKNOWN,
    confidence: 0.55,
    suggestedStatus: undefined,
    reasoning: 'mocked LLM response',
    source: 'llm',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('EmailClassificationService', () => {
  let service: EmailClassificationService;
  let llmService: jest.Mocked<EmailLLMClassificationService>;

  beforeAll(() => {
    // Silence logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
  });

  beforeEach(async () => {
    const mockLlm = { classify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailClassificationService,
        EmailNormalizerService,
        EmailIntentMapper,
        HelperService,
        { provide: EmailLLMClassificationService, useValue: mockLlm },
      ],
    }).compile();

    service = module.get(EmailClassificationService);
    llmService = module.get(EmailLLMClassificationService);
  });

  // -------------------------------------------------------------------------
  // Sanity check on the exported threshold constant
  // -------------------------------------------------------------------------

  it('exports EMAIL_CLASSIFICATION_LLM_THRESHOLD as a named constant', () => {
    expect(typeof EMAIL_CLASSIFICATION_LLM_THRESHOLD).toBe('number');
    expect(EMAIL_CLASSIFICATION_LLM_THRESHOLD).toBeGreaterThan(0);
    expect(EMAIL_CLASSIFICATION_LLM_THRESHOLD).toBeLessThan(1);
  });

  // -------------------------------------------------------------------------
  // Rule-based path, LLM must NOT be called
  // -------------------------------------------------------------------------

  describe('rule-based classification (no LLM call)', () => {
    it('strong confirmation, source:rules, intent:confirmation, suggestedStatus:Awaiting response', async () => {
      const result = await service.classify(SAMPLES.strongConfirmation);

      expect(result.source).toBe('rules');
      expect(result.intent).toBe(EmailIntent.CONFIRMATION);
      expect(result.confidence).toBeGreaterThanOrEqual(EMAIL_CLASSIFICATION_LLM_THRESHOLD);
      expect(result.suggestedStatus).toBe(ApplicationStatus.AWAITING_RESPONSE);
      expect(result.matchedRules?.length).toBeGreaterThan(0);
      expect(llmService.classify).not.toHaveBeenCalled();
    });

    it('strong rejection, source:rules, intent:rejection, suggestedStatus:Rejected', async () => {
      const result = await service.classify(SAMPLES.strongRejection);

      expect(result.source).toBe('rules');
      expect(result.intent).toBe(EmailIntent.REJECTION);
      expect(result.confidence).toBeGreaterThanOrEqual(EMAIL_CLASSIFICATION_LLM_THRESHOLD);
      expect(result.suggestedStatus).toBe(ApplicationStatus.REJECTED);
      expect(llmService.classify).not.toHaveBeenCalled();
    });

    it('interview invite, source:rules, intent:interview, suggestedStatus:Interview scheduled', async () => {
      const result = await service.classify(SAMPLES.interviewInvite);

      expect(result.source).toBe('rules');
      expect(result.intent).toBe(EmailIntent.INTERVIEW);
      expect(result.confidence).toBeGreaterThanOrEqual(EMAIL_CLASSIFICATION_LLM_THRESHOLD);
      expect(result.suggestedStatus).toBe(ApplicationStatus.INTERVIEW_SCHEDULED);
      expect(llmService.classify).not.toHaveBeenCalled();
    });

    it('assessment request, source:rules, intent:assessment, suggestedStatus:Awaiting interview', async () => {
      const result = await service.classify(SAMPLES.assessmentRequest);

      expect(result.source).toBe('rules');
      expect(result.intent).toBe(EmailIntent.ASSESSMENT);
      expect(result.confidence).toBeGreaterThanOrEqual(EMAIL_CLASSIFICATION_LLM_THRESHOLD);
      expect(result.suggestedStatus).toBe(ApplicationStatus.AWAITING_INTERVIEW);
      expect(llmService.classify).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // LLM escalation path
  // -------------------------------------------------------------------------

  describe('LLM escalation', () => {
    it('ambiguous email with competing signals, escalates to LLM', async () => {
      llmService.classify.mockResolvedValueOnce(
        makeLlmResult({ intent: EmailIntent.INTERVIEW, confidence: 0.8, suggestedStatus: ApplicationStatus.INTERVIEW_SCHEDULED }),
      );

      const result = await service.classify(SAMPLES.ambiguousPolite);

      expect(llmService.classify).toHaveBeenCalledTimes(1);
      expect(result.source).toBe('llm');
      expect(result.intent).toBe(EmailIntent.INTERVIEW);
      expect(result.suggestedStatus).toBe(ApplicationStatus.INTERVIEW_SCHEDULED);
      expect(result.confidence).toBe(0.8);
    });

    it('irrelevant noise with no rule matches, escalates to LLM', async () => {
      llmService.classify.mockResolvedValueOnce(
        makeLlmResult({ intent: EmailIntent.UNKNOWN, confidence: 0.3, suggestedStatus: undefined }),
      );

      const result = await service.classify(SAMPLES.irrelevantNoise);

      expect(llmService.classify).toHaveBeenCalledTimes(1);
      expect(result.source).toBe('llm');
      expect(result.intent).toBe(EmailIntent.UNKNOWN);
      expect(result.suggestedStatus).toBeUndefined();
    });

    it('passes normalized email and rule result context to LLM', async () => {
      llmService.classify.mockResolvedValueOnce(makeLlmResult());

      await service.classify(SAMPLES.ambiguousPolite);

      const [normalizedArg, ruleResultArg] = llmService.classify.mock.calls[0];
      expect(normalizedArg.subject).toBe('following up on your application');
      expect(ruleResultArg.source).toBe('rules');
      expect(ruleResultArg.matchedRules.length).toBeGreaterThan(0);
      expect(ruleResultArg.confidence).toBeLessThan(EMAIL_CLASSIFICATION_LLM_THRESHOLD);
    });
  });

  // -------------------------------------------------------------------------
  // LLM suggestedStatus validation via EmailIntentMapper
  // -------------------------------------------------------------------------

  describe('LLM suggestedStatus validation', () => {
    it('accepts a valid LLM suggestion within the intent category', async () => {
      // PROBABLY_NOT is in ALLOWED_STATUSES_BY_INTENT[REJECTION]
      llmService.classify.mockResolvedValueOnce(
        makeLlmResult({ intent: EmailIntent.REJECTION, confidence: 0.9, suggestedStatus: ApplicationStatus.PROBABLY_NOT }),
      );

      const result = await service.classify(SAMPLES.ambiguousPolite);

      expect(result.suggestedStatus).toBe(ApplicationStatus.PROBABLY_NOT);
    });

    it('rejects an invalid LLM suggestion and falls back to mapper default', async () => {
      // INTERVIEW_SCHEDULED is NOT a valid status for REJECTION intent
      llmService.classify.mockResolvedValueOnce(
        makeLlmResult({ intent: EmailIntent.REJECTION, confidence: 0.9, suggestedStatus: ApplicationStatus.INTERVIEW_SCHEDULED }),
      );

      const result = await service.classify(SAMPLES.ambiguousPolite);

      expect(result.suggestedStatus).toBe(ApplicationStatus.REJECTED); // mapper default for REJECTION
    });

    it('handles LLM returning no suggestedStatus, uses mapper default', async () => {
      llmService.classify.mockResolvedValueOnce(
        makeLlmResult({ intent: EmailIntent.CONFIRMATION, confidence: 0.75, suggestedStatus: undefined }),
      );

      const result = await service.classify(SAMPLES.ambiguousPolite);

      expect(result.suggestedStatus).toBe(ApplicationStatus.AWAITING_RESPONSE); // mapper default for CONFIRMATION
    });
  });

  // -------------------------------------------------------------------------
  // Result shape
  // -------------------------------------------------------------------------

  describe('result shape', () => {
    it('every rule-based result includes intent, confidence, source, matchedRules, and suggestedStatus', async () => {
      const result = await service.classify(SAMPLES.strongConfirmation);

      expect(result).toMatchObject({
        intent: expect.any(String),
        confidence: expect.any(Number),
        source: 'rules',
        matchedRules: expect.any(Array),
      });
    });

    it('every LLM result includes intent, confidence, source, reasoning, and suggestedStatus', async () => {
      llmService.classify.mockResolvedValueOnce(
        makeLlmResult({ intent: EmailIntent.REJECTION, confidence: 0.85, suggestedStatus: ApplicationStatus.REJECTED, reasoning: 'Tone indicates rejection.' }),
      );

      const result = await service.classify(SAMPLES.irrelevantNoise);

      expect(result).toMatchObject({
        intent: EmailIntent.REJECTION,
        confidence: 0.85,
        source: 'llm',
        reasoning: 'Tone indicates rejection.',
        suggestedStatus: ApplicationStatus.REJECTED,
      });
    });
  });
});
