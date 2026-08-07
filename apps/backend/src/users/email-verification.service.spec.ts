import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailVerificationService } from './email-verification.service';
import { InMemoryEmailVerificationStore } from './email-verification.store';
import { InvalidOrExpiredVerificationTokenError } from './email-verification.errors';
import {
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  EmailVerificationRequestedEvent,
} from './events/email-verification-requested.event';
import { generateToken } from './token.util';

describe('EmailVerificationService', () => {
  const TTL_HOURS = 24;

  let store: InMemoryEmailVerificationStore;
  let events: { emit: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let service: EmailVerificationService;

  beforeEach(() => {
    store = new InMemoryEmailVerificationStore();
    events = { emit: jest.fn() };
    config = { getOrThrow: jest.fn().mockReturnValue(TTL_HOURS) };
    service = new EmailVerificationService(
      store,
      config as unknown as ConfigService,
      events as unknown as EventEmitter2,
    );
  });

  describe('verify', () => {
    it('returns userId for a valid token', async () => {
      store.seed({ id: 'user-1', email: 'a@example.com', verified: false });
      const { token, tokenHash, expiresAt } = generateToken(TTL_HOURS);
      await store.assign('a@example.com', tokenHash, expiresAt);

      await expect(service.verify(token)).resolves.toBe('user-1');
    });

    it('rejects an unknown token', async () => {
      await expect(service.verify('x'.repeat(64))).rejects.toThrow(
        InvalidOrExpiredVerificationTokenError,
      );
    });

    it('rejects an expired token', async () => {
      store.seed({ id: 'user-1', email: 'a@example.com', verified: false });
      const { token, tokenHash } = generateToken(TTL_HOURS);
      await store.assign(
        'a@example.com',
        tokenHash,
        new Date(Date.now() - 1000),
      );

      await expect(service.verify(token)).rejects.toThrow(
        InvalidOrExpiredVerificationTokenError,
      );
    });

    it('rejects an already consumed token', async () => {
      store.seed({ id: 'user-1', email: 'a@example.com', verified: false });
      const { token, tokenHash, expiresAt } = generateToken(TTL_HOURS);
      await store.assign('a@example.com', tokenHash, expiresAt);

      await service.verify(token);
      await expect(service.verify(token)).rejects.toThrow(
        InvalidOrExpiredVerificationTokenError,
      );
    });
  });

  describe('resend', () => {
    it('assigns a fresh token and emits the mail event for an unverified user', async () => {
      store.seed({ id: 'user-1', email: 'a@example.com', verified: false });

      await service.resend(' A@Example.com ', 'http://localhost:5173');

      expect(events.emit).toHaveBeenCalledTimes(1);
      const [name, event] = events.emit.mock.calls[0] as [
        string,
        EmailVerificationRequestedEvent,
      ];
      expect(name).toBe(EMAIL_VERIFICATION_REQUESTED_EVENT);
      expect(event).toBeInstanceOf(EmailVerificationRequestedEvent);
      expect(event.userId).toBe('user-1');
      expect(event.delivery.email).toBe('a@example.com');
      expect(event.delivery.origin).toBe('http://localhost:5173');
      expect(event.delivery.token).toMatch(/^[a-f0-9]{64}$/);

      await expect(service.verify(event.delivery.token)).resolves.toBe(
        'user-1',
      );
    });

    it('reads TTL from validated config via getOrThrow', async () => {
      store.seed({ id: 'user-1', email: 'a@example.com', verified: false });

      await service.resend('a@example.com');

      expect(config.getOrThrow).toHaveBeenCalledWith(
        'VERIFICATION_TOKEN_TTL_HOURS',
      );
    });

    it('is a silent no-op for an unknown email', async () => {
      await service.resend('missing@example.com');

      expect(events.emit).not.toHaveBeenCalled();
    });

    it('is a silent no-op for an already verified user', async () => {
      store.seed({ id: 'user-1', email: 'a@example.com', verified: true });

      await service.resend('a@example.com');

      expect(events.emit).not.toHaveBeenCalled();
    });

    it('invalidates the previous token', async () => {
      store.seed({ id: 'user-1', email: 'a@example.com', verified: false });

      await service.resend('a@example.com');
      const [, firstEvent] = events.emit.mock.calls[0] as [
        string,
        EmailVerificationRequestedEvent,
      ];
      const firstToken = firstEvent.delivery.token;
      await service.resend('a@example.com');

      await expect(service.verify(firstToken)).rejects.toThrow(
        InvalidOrExpiredVerificationTokenError,
      );
    });
  });
});
