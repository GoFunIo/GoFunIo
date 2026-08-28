import { sendResendEmail } from './resend.client';
import type { MailTransport, MailTransportSendInput } from './mail-transport';

export class ResendMailTransport implements MailTransport {
  constructor(private readonly apiKey: string) {}

  async send(input: MailTransportSendInput): Promise<{ messageId: string }> {
    const accepted = await sendResendEmail(this.apiKey, input);
    return { messageId: accepted.id };
  }
}
