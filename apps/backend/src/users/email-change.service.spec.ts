import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailChangeService } from './email-change.service';
import { InMemoryEmailChangeStore } from './email-change.store';
import {
  EmailChangeEmailInUseError,
  InvalidCurrentPasswordError,
  InvalidOrExpiredEmailChangeTokenError,
} from './email-change.errors';
import {
  USER_EMAIL_CHANGE_REQUESTED_EVENT,
  UserEmailChangeRequestedEvent,
} from './events/user-email-change-requested.event';
import { hashPassword } from './password.util';

describe('EmailChangeService', () => {
  let store: InMemoryEmailChangeStore;
  let events: { emit: jest.Mock };
  let service: EmailChangeService;

  beforeEach(() => {
    store = new InMemoryEmailChangeStore();
    events = { emit: jest.fn() };
    service = new EmailChangeService(
      store,
      { getOrThrow: jest.fn().mockReturnValue(24) } as unknown as ConfigService,
      events as unknown as EventEmitter2,
    );
  });

  async function seed(id = 'user-1', email = 'old@example.com'): Promise<void> {
    store.seed({
      id,
      email,
      passwordHash: await hashPassword('password123'),
      emailVerifiedAt: new Date(),
    });
  }

  function emitted(): UserEmailChangeRequestedEvent {
    const [name, event] = events.emit.mock.calls[0] as [
      string,
      UserEmailChangeRequestedEvent,
    ];
    expect(name).toBe(USER_EMAIL_CHANGE_REQUESTED_EVENT);
    return event;
  }

  it('requests and confirms an email change through the public interface', async () => {
    await seed();
    await service.request(
      'user-1',
      ' New@Example.com ',
      'password123',
      'http://localhost',
    );

    const event = emitted();
    expect(event.delivery).toMatchObject({
      email: 'new@example.com',
      origin: 'http://localhost',
    });
    await service.confirm(event.delivery.token);
    expect(store.get('user-1')?.email).toBe('new@example.com');
  });

  it('requires the current password', async () => {
    await seed();
    await expect(
      service.request('user-1', 'new@example.com', 'wrong'),
    ).rejects.toThrow(InvalidCurrentPasswordError);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('rejects an email held by another account or pending claim', async () => {
    await seed();
    await seed('user-2', 'taken@example.com');
    await expect(
      service.request('user-1', 'taken@example.com', 'password123'),
    ).rejects.toThrow(EmailChangeEmailInUseError);

    await service.request('user-1', 'claim@example.com', 'password123');
    await expect(
      service.request('user-2', 'claim@example.com', 'password123'),
    ).rejects.toThrow(EmailChangeEmailInUseError);
  });

  it('rejects invalid, expired and consumed tokens with one error', async () => {
    await seed();
    await expect(service.confirm('x'.repeat(64))).rejects.toThrow(
      InvalidOrExpiredEmailChangeTokenError,
    );

    await service.request('user-1', 'new@example.com', 'password123');
    const token = emitted().delivery.token;
    await service.confirm(token);
    await expect(service.confirm(token)).rejects.toThrow(
      InvalidOrExpiredEmailChangeTokenError,
    );
  });
});
