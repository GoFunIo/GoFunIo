export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export interface MailTransportSendInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export interface MailTransport {
  send(input: MailTransportSendInput): Promise<{ messageId: string }>;
}
