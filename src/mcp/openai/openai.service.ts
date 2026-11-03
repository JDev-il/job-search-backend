import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { BackoffOptions, HTTP_TIMEOUT_MS, retryWithBackoff } from "../../common/resilience";

@Injectable()
export class OpenAIService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly logger = new Logger(OpenAIService.name);

  /** Retry policy for the API call (rate limits, 5xx, dropped connections). Public-ish so tests can swap the sleep. */
  private readonly backoff: BackoffOptions = {
    onRetry: (err, attempt, delayMs) => {
      const e = err as { code?: string; response?: { status?: number } };
      this.logger.warn(`OpenAI request failed (${e?.response?.status ?? e?.code ?? 'unknown'}), retry ${attempt} in ${delayMs}ms`);
    },
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
  }


  async ask(messages: { role: 'user' | 'assistant' | 'system'; content: string }[] | unknown): Promise<string> {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const body = {
      model: 'gpt-4',
      messages,
    };

    const response = await this.post(body, headers);

    return response.data.choices[0].message.content;
  }

  async askStructured<T>(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<T> {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const body = {
      model: 'gpt-3.5-turbo',
      messages,
      response_format: { type: 'json_object' },
    };

    const response = await this.post(body, headers);

    return JSON.parse(response.data.choices[0].message.content) as T;
  }

  private post(body: unknown, headers: Record<string, string>) {
    return retryWithBackoff(
      () => firstValueFrom(this.httpService.post(this.apiUrl, body, { headers, timeout: HTTP_TIMEOUT_MS.llm })),
      this.backoff,
    );
  }
}
