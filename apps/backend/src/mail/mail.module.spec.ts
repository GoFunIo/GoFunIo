import { ConfigService } from '@nestjs/config';
import { type EnvVars, MailTransportDriver } from '../config/env.validation';
import { createMailTransport } from './mail.module';
import { ResendMailTransport } from './resend-mail.transport';
import { SmtpMailTransport } from './smtp-mail.transport';

function config(values: Partial<EnvVars>): ConfigService<EnvVars, true> {
  return {
    get: (key: keyof EnvVars) => values[key],
    getOrThrow: (key: keyof EnvVars) => {
      const value = values[key];
      if (value === undefined) throw new Error(`Missing key: ${key}`);
      return value;
    },
  } as ConfigService<EnvVars, true>;
}

describe('createMailTransport', () => {
  it('selects the Resend adapter', () => {
    expect(
      createMailTransport(
        config({
          MAIL_TRANSPORT: MailTransportDriver.Resend,
          RESEND_API_KEY: 're_test',
        }),
      ),
    ).toBeInstanceOf(ResendMailTransport);
  });

  it('selects the SMTP adapter', () => {
    expect(
      createMailTransport(
        config({
          MAIL_TRANSPORT: MailTransportDriver.Smtp,
          MAIL_SMTP_HOST: 'localhost',
          MAIL_SMTP_PORT: 1025,
        }),
      ),
    ).toBeInstanceOf(SmtpMailTransport);
  });
});
