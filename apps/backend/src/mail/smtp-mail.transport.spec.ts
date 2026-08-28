import { SmtpMailTransport } from './smtp-mail.transport';

describe('SmtpMailTransport', () => {
  it('maps message fields and returns the SMTP message id', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: '<smtp-123>' });
    const transport = new SmtpMailTransport({ sendMail });

    await expect(
      transport.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
        text: 'Text',
        html: '<p>HTML</p>',
        idempotencyKey: 'not-supported-by-smtp',
      }),
    ).resolves.toEqual({ messageId: '<smtp-123>' });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Subject',
      text: 'Text',
      html: '<p>HTML</p>',
    });
  });

  it('propagates SMTP errors', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      new SmtpMailTransport({ sendMail }).send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject',
        html: '<p>HTML</p>',
      }),
    ).rejects.toThrow('SMTP unavailable');
  });
});
