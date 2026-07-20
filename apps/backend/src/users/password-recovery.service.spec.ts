import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PasswordRecoveryService } from './password-recovery.service';
import { InMemoryPasswordRecoveryStore } from './password-recovery.store';
import { InvalidOrExpiredPasswordRecoveryTokenError } from './password-recovery.errors';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from './events/password-reset-requested.event';
import { generateToken } from './token.util';
import { verifyPassword } from './password.util';

describe('PasswordRecoveryService', () => {
  const TTL_HOURS = 24;

  let store: InMemoryPasswordRecoveryStore;
  let events: { emit: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let service: PasswordRecoveryService;

  beforeEach(() => {
    store = new InMemoryPasswordRecoveryStore();
    events = { emit: jest.fn() };
    config = { getOrThrow: jest.fn().mockReturnValue(TTL_HOURS) };
    service = new PasswordRecoveryService(
      store,
      config as unknown as ConfigService,
      events as unknown as EventEmitter2,
    );
  });

  function seed(passwordHash: string | null = 'old.hash'): void {
    store.seed({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash,
      emailVerifiedAt: passwordHash === null ? null : new Date(),
      passwordVersion: 1,
    });
  }

  function emitted(): PasswordResetRequestedEvent {
    const [name, event] = events.emit.mock.calls[0] as [
      string,
      PasswordResetRequestedEvent,
    ];
    expect(name).toBe(PASSWORD_RESET_REQUESTED_EVENT);
    return event;
  }

  it('requests recovery without revealing unknown emails', async () => {
    await expect(
      service.request('missing@example.com'),
    ).resolves.toBeUndefined();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('issues a reset token for an existing account', async () => {
    seed();

    await service.request(' User@Example.com ', 'http://localhost');

    const event = emitted();
    expect(event.delivery).toMatchObject({
      email: 'user@example.com',
      origin: 'http://localhost',
    });
    expect(event.delivery.token).toMatch(/^[a-f0-9]{64}$/);
    expect(event.ttlHours).toBe(TTL_HOURS);
    expect(event.isFirstPassword).toBe(false);
    expect(config.getOrThrow).toHaveBeenCalledWith(
      'PASSWORD_RESET_TOKEN_TTL_HOURS',
    );
  });

  it('marks passwordless accounts as first-password delivery', async () => {
    seed(null);

    await service.request('user@example.com');

    expect(emitted().isFirstPassword).toBe(true);
  });

  it('issues the first-password lifecycle by userId', async () => {
    seed(null);

    await service.issueFirstPassword('user-1', 'http://localhost');

    const event = emitted();
    expect(event.userId).toBe('user-1');
    expect(event.isFirstPassword).toBe(true);
    expect(event.delivery.origin).toBe('http://localhost');
  });

  it('atomically resets the password and increments passwordVersion', async () => {
    seed(null);
    await service.request('user@example.com');
    const token = emitted().delivery.token;

    await service.reset(token, 'new-password-123');

    const user = store.get('user-1')!;
    expect(await verifyPassword('new-password-123', user.passwordHash!)).toBe(
      true,
    );
    expect(user.passwordVersion).toBe(2);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('rejects invalid, expired and consumed tokens with one error', async () => {
    seed();
    await expect(service.reset('x'.repeat(64), 'new-password')).rejects.toThrow(
      InvalidOrExpiredPasswordRecoveryTokenError,
    );

    const { token, tokenHash } = generateToken(TTL_HOURS);
    await store.assignByEmail(
      'user@example.com',
      tokenHash,
      new Date(Date.now() - 1000),
    );
    await expect(service.reset(token, 'new-password')).rejects.toThrow(
      InvalidOrExpiredPasswordRecoveryTokenError,
    );

    await service.request('user@example.com');
    const validToken = emitted().delivery.token;
    await service.reset(validToken, 'new-password');
    await expect(service.reset(validToken, 'another-password')).rejects.toThrow(
      InvalidOrExpiredPasswordRecoveryTokenError,
    );
  });
});
