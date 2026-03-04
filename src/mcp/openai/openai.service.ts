import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

@Injectable()
export class OpenAIService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

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

    const response = await firstValueFrom(
      this.httpService.post(this.apiUrl, body, { headers })
    );

    return response.data.choices[0].message.content;
  }
}
