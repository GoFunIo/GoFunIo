export const NOTIFICATION_EMAIL_SENDER = Symbol('NOTIFICATION_EMAIL_SENDER');

export interface NotificationEmailSendInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

export interface NotificationEmailSender {
  send(
    input: NotificationEmailSendInput,
  ): Promise<{ providerMessageId: string }>;
}
