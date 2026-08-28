import { randomUUID } from 'crypto';
import { SmtpMailTransport } from '../../src/mail/smtp-mail.transport';

interface MailpitAddress {
  Address: string;
}

interface MailpitMessageSummary {
  ID: string;
  Subject: string;
}

interface MailpitMessage extends MailpitMessageSummary {
  From: MailpitAddress;
  To: MailpitAddress[];
  HTML: string;
}

interface MailpitMessagesResponse {
  messages: MailpitMessageSummary[];
}

const smtpHost = process.env.MAIL_SMTP_HOST ?? 'localhost';
const smtpPort = Number(process.env.MAIL_SMTP_PORT ?? 1025);
const apiUrl = process.env.MAILPIT_API_URL ?? 'http://localhost:8025';

async function findMessage(subject: string): Promise<MailpitMessageSummary> {
  const deadline = Date.now() + 5_000;
  do {
    const response = await fetch(`${apiUrl}/api/v1/messages?limit=50`);
    if (!response.ok) {
      throw new Error(`Mailpit messages request failed (${response.status})`);
    }
    const body = (await response.json()) as MailpitMessagesResponse;
    const message = body.messages.find((candidate) =>
      candidate.Subject.includes(subject),
    );
    if (message) return message;
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  throw new Error(`Mailpit did not capture message with subject: ${subject}`);
}

describe('SMTP Mailpit contract', () => {
  let capturedId: string | undefined;

  afterEach(async () => {
    if (!capturedId) return;
    await fetch(`${apiUrl}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: [capturedId] }),
    });
  });

  it('delivers sender, recipient, subject and HTML through SMTP', async () => {
    const marker = randomUUID();
    const subject = `GoFunIo Mailpit contract ${marker}`;
    const html = `<p>Contract marker: <strong>${marker}</strong></p>`;
    const transport = SmtpMailTransport.create({
      host: smtpHost,
      port: smtpPort,
    });

    const accepted = await transport.send({
      from: 'GoFunIo Contract <sender@gofunio.local>',
      to: 'recipient@gofunio.local',
      subject,
      text: `Contract marker: ${marker}`,
      html,
    });
    expect(accepted.messageId).toBeTruthy();

    const summary = await findMessage(subject);
    capturedId = summary.ID;
    const response = await fetch(
      `${apiUrl}/api/v1/message/${encodeURIComponent(summary.ID)}`,
    );
    expect(response.status).toBe(200);
    const message = (await response.json()) as MailpitMessage;

    expect(message.Subject).toBe(subject);
    expect(message.From.Address).toBe('sender@gofunio.local');
    expect(message.To.map(({ Address }) => Address)).toContain(
      'recipient@gofunio.local',
    );
    expect(message.HTML).toContain(html);
  });
});
