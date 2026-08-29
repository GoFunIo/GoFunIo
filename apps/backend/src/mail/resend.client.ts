export interface ResendSendEmailInput {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html: string;
  idempotencyKey?: string;
}

export interface ResendSendEmailResult {
  id: string;
}

export class ResendHttpError extends Error {
  constructor(readonly status: number) {
    super(`Resend API request failed (${status})`);
    this.name = ResendHttpError.name;
  }
}

export class ResendResponseError extends Error {
  constructor() {
    super('Resend API returned an invalid acceptance response');
    this.name = ResendResponseError.name;
  }
}

export async function sendResendEmail(
  apiKey: string,
  input: ResendSendEmailInput,
): Promise<ResendSendEmailResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': 'gofunio-backend/1.0',
  };
  if (input.idempotencyKey) {
    headers['Idempotency-Key'] = input.idempotencyKey;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      ...(input.text ? { text: input.text } : {}),
      html: input.html,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new ResendHttpError(response.status);
  }
  try {
    const result = JSON.parse(body) as Partial<ResendSendEmailResult>;
    if (
      typeof result.id !== 'string' ||
      result.id.length === 0 ||
      result.id.length > 255
    ) {
      throw new ResendResponseError();
    }
    return { id: result.id };
  } catch (error) {
    if (error instanceof ResendResponseError) throw error;
    throw new ResendResponseError();
  }
}
