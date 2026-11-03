import { of, throwError } from 'rxjs';
import { OpenAIService } from './openai.service';

describe('OpenAIService.askStructured', () => {
  const reply = (content: string) => of({ data: { choices: [{ message: { content } }] } });
  const http = (status: number) => Object.assign(new Error(`status ${status}`), { response: { status } });
  let httpService: { post: jest.Mock };
  let service: OpenAIService;

  beforeEach(() => {
    httpService = { post: jest.fn() };
    service = new OpenAIService(httpService as any, { get: jest.fn().mockReturnValue('key') } as any);
    (service as any).backoff.sleep = jest.fn().mockResolvedValue(undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  });

  it('parses the JSON the model returns', async () => {
    httpService.post.mockReturnValue(reply('{"intent":"rejection"}'));

    await expect(service.askStructured([])).resolves.toEqual({ intent: 'rejection' });
  });

  it('puts a timeout on the request', async () => {
    httpService.post.mockReturnValue(reply('{}'));

    await service.askStructured([]);

    expect(httpService.post.mock.calls[0][2].timeout).toBe(60_000);
  });

  it('retries a rate-limited or failing call instead of losing the email it was classifying', async () => {
    httpService.post
      .mockReturnValueOnce(throwError(() => http(429)))
      .mockReturnValueOnce(throwError(() => http(502)))
      .mockReturnValueOnce(reply('{"intent":"interview"}'));

    await expect(service.askStructured([])).resolves.toEqual({ intent: 'interview' });

    expect(httpService.post).toHaveBeenCalledTimes(3);
  });

  it('does not retry a request OpenAI rejected as invalid (400)', async () => {
    httpService.post.mockReturnValue(throwError(() => http(400)));

    await expect(service.askStructured([])).rejects.toMatchObject({ response: { status: 400 } });

    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the reply is not valid JSON (the call itself succeeded)', async () => {
    httpService.post.mockReturnValue(reply('not json'));

    await expect(service.askStructured([])).rejects.toThrow(SyntaxError);

    expect(httpService.post).toHaveBeenCalledTimes(1);
  });
});
