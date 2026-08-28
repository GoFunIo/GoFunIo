import * as resendClient from './resend.client';
import { ResendMailTransport } from './resend-mail.transport';

describe('ResendMailTransport', () => {
  afterEach(() => jest.restoreAllMocks());

  it('forwards the complete input and maps the provider message id', async () => {
    const send = jest
      .spyOn(resendClient, 'sendResendEmail')
      .mockResolvedValue({ id: 'resend_123' });
    const transport = new ResendMailTransport('re_test');
    const input = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Subject',
      text: 'Text',
      html: '<p>HTML</p>',
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
    };

    await expect(transport.send(input)).resolves.toEqual({
      messageId: 'resend_123',
    });
    expect(send).toHaveBeenCalledWith('re_test', input);
  });

  it('propagates provider errors', async () => {
    jest
      .spyOn(resendClient, 'sendResendEmail')
      .mockRejectedValue(new Error('provider unavailable'));

    await expect(
      new ResendMailTransport('re_test').send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
        html: '<p>HTML</p>',
      }),
    ).rejects.toThrow('provider unavailable');
  });
});
