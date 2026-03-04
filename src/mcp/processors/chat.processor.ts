import { Injectable } from '@nestjs/common';
import { MCPBasePayload } from '../dto/mcp.dto';
import { MCPProcessor } from '../interfaces/mcp-processor.interface';
import { OpenAIService } from '../openai/openai.service';

@Injectable()
export class ChatProcessor implements MCPProcessor {
  constructor(private readonly openaiService: OpenAIService) { }

  async process(payload: MCPBasePayload): Promise<any> {
    const { payload: data } = payload;
    const userMessage = data.message;
    const searchCriteria = data?.criteria; // Expecting JobSearchCriteria

    const criteriaString = searchCriteria
      ? `Here is the user's job search criteria: 
      Location: ${searchCriteria.location}
      Roles: ${searchCriteria.roles.join(', ')}
      Experience: ${searchCriteria.minYearsExperience}-${searchCriteria.maxYearsExperience} years
      Technologies: ${searchCriteria.technologies.join(', ')}
      ${searchCriteria.remoteOnly ? 'Only remote jobs' : ''}
      ${searchCriteria.salaryExpectation ? 'Salary expectation: $' + searchCriteria.salaryExpectation : ''}
      ${searchCriteria.otherPreferences ? 'Other: ' + searchCriteria.otherPreferences : ''}`
      : '';

    const messages: { role: string, content: string }[] = [
      {
        role: 'system',
        content: `You are an assistant helping job seekers craft strategies and messages based on their preferences.`,
      },
      {
        role: 'user',
        content: `${criteriaString}\n\n${userMessage}`,
      },
    ];

    const aiResponse = await this.openaiService.ask(messages);

    return {
      prompt: userMessage,
      enriched: !!searchCriteria,
      response: aiResponse,
    };
  }
}