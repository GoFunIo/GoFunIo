import {
  ResendHttpError,
  ResendResponseError,
  sendResendEmail,
} from './resend.client';

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
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
    });

    expect(result).toEqual({ id: 'email_123' });
    const [url, options] = (global.fetch as jest.MockedFunction<typeof fetch>)
      .mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer re_test',
        'Content-Type': 'application/json',
        'Idempotency-Key': '22222222-2222-4222-8222-222222222222',
        'User-Agent': 'gofunio-backend/1.0',
      },
      body: JSON.stringify({
        from: 'GoFunIo <no-reply@test.com>',
        to: ['user@example.com'],
        subject: 'Hello',
        html: '<p>Hi</p>',
      }),
    });
  });

  it('throws a typed status-only error on non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('{"message":"Invalid from"}'),
    });

    const promise = sendResendEmail('re_test', {
      from: 'bad',
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });
    await expect(promise).rejects.toEqual(new ResendHttpError(422));
    await expect(promise).rejects.not.toThrow('Invalid from');
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

  it('rejects an accepted response without a bounded provider message id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"id":""}'),
    });

    await expect(
      sendResendEmail('re_test', {
        from: 'GoFunIo <no-reply@test.com>',
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      }),
    ).rejects.toEqual(new ResendResponseError());
  });
});
