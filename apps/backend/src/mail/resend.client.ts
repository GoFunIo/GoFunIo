export interface ResendSendEmailInput {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface ResendSendEmailResult {
  id: string;
}

export async function sendResendEmail(
  apiKey: string,
  input: ResendSendEmailInput,
): Promise<ResendSendEmailResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Resend API ${response.status}: ${body}`);
  }

  return JSON.parse(body) as ResendSendEmailResult;
}
