import { sendResendEmail } from './resend.client';

describe('sendResendEmail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('POSTs to Resend with Bearer auth and returns id on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"id":"email_123"}'),
    });

    const result = await sendResendEmail('re_test', {
      from: 'GoFunIo <no-reply@test.com>',
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(result).toEqual({ id: 'email_123' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer re_test',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GoFunIo <no-reply@test.com>',
          to: ['user@example.com'],
          subject: 'Hello',
          html: '<p>Hi</p>',
        }),
      }),
    );
  });

  it('throws with status and body on non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('{"message":"Invalid from"}'),
    });

    await expect(
      sendResendEmail('re_test', {
        from: 'bad',
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      }),
    ).rejects.toThrow('Resend API 422: {"message":"Invalid from"}');
  });

  it('propagates network errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection timeout'));

    await expect(
      sendResendEmail('re_test', {
        from: 'GoFunIo <no-reply@test.com>',
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      }),
    ).rejects.toThrow('Connection timeout');
  });
});
