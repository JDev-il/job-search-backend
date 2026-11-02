import { GmailProcessingService } from './gmail-processing.service';

describe('GmailProcessingService.processNotification', () => {
  const SUBJECT = 'Your interview with Acme';
  const BODY = 'Hi Jonathan, we would like to invite you to a final round on Tuesday.';

  it('never writes an email subject or body to the logs', async () => {
    const userService = {
      findByGmailEmail: jest.fn().mockResolvedValue({ userId: 3, gmailHistoryId: '100' }),
      updateGmailHistoryId: jest.fn().mockResolvedValue(undefined),
    };
    const gmailApiService = {
      getNewMessageIds: jest.fn().mockResolvedValue(['m1']),
      fetchMessage: jest.fn().mockResolvedValue({
        messageId: 'm1',
        threadId: 't1',
        subject: SUBJECT,
        bodyText: BODY,
        senderDomain: 'acme.com',
      }),
    };
    const classificationService = {
      classify: jest.fn().mockResolvedValue({ intent: 'unknown', confidence: 0.1, source: 'rules' }),
    };
    const service = new GmailProcessingService(
      userService as any,
      gmailApiService as any,
      classificationService as any,
      {} as any,
      {} as any,
    );

    const logged: string[] = [];
    for (const level of ['log', 'debug', 'verbose', 'warn', 'error'] as const) {
      jest.spyOn((service as any).logger, level).mockImplementation((msg: unknown) => {
        logged.push(String(msg));
      });
    }

    await service.processNotification('me@gmail.com', '200');

    expect(classificationService.classify).toHaveBeenCalledTimes(1); // the message really went through
    expect(logged.length).toBeGreaterThan(0);
    for (const line of logged) {
      expect(line).not.toContain(SUBJECT);
      expect(line).not.toContain('final round');
    }
    expect(userService.updateGmailHistoryId).toHaveBeenCalledWith(3, '200');
  });
});
