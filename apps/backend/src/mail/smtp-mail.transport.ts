import nodemailer, { type SendMailOptions } from 'nodemailer';
import type { MailTransport, MailTransportSendInput } from './mail-transport';

interface SmtpSender {
  sendMail(message: SendMailOptions): Promise<{ messageId: string }>;
}

export interface SmtpMailTransportOptions {
  host: string;
  port: number;
}

export class SmtpMailTransport implements MailTransport {
  static create(options: SmtpMailTransportOptions): SmtpMailTransport {
    return new SmtpMailTransport(
      nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: false,
        ignoreTLS: true,
      }),
    );
  }

  constructor(private readonly sender: SmtpSender) {}

  async send(input: MailTransportSendInput): Promise<{ messageId: string }> {
    const accepted = await this.sender.sendMail({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    });
    return { messageId: accepted.messageId };
  }
}
