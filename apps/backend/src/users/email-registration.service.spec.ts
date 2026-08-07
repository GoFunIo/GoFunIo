import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailRegistrationService } from './email-registration.service';
import {
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  EmailVerificationRequestedEvent,
} from './events/email-verification-requested.event';
import { FakePasswordHasher } from './password-hasher';
import { hashToken } from './token.util';
import { FakeWorkspaceOwnerProvisioner } from './workspace-owner-provisioner';

describe('EmailRegistrationService', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue(24),
  } as unknown as ConfigService;
  let provisioner: FakeWorkspaceOwnerProvisioner;
  let hasher: FakePasswordHasher;
  let events: { emit: jest.Mock };
  let service: EmailRegistrationService;

  beforeEach(() => {
    provisioner = new FakeWorkspaceOwnerProvisioner();
    hasher = new FakePasswordHasher();
    events = { emit: jest.fn() };
    service = new EmailRegistrationService(
      provisioner,
      hasher,
      config,
      events as unknown as EventEmitter2,
    );
  });

  it('hashes credentials, provisions safely, then emits verification', async () => {
    const account = await service.register(
      ' New@Example.com ',
      'password123',
      'http://localhost',
    );

    expect(provisioner.calls[0]).toMatchObject({
      email: 'new@example.com',
      passwordHash: 'hash-1',
    });
    const [name, event] = events.emit.mock.calls[0] as [
      string,
      EmailVerificationRequestedEvent,
    ];
    expect(name).toBe(EMAIL_VERIFICATION_REQUESTED_EVENT);
    expect(event).toMatchObject({
      userId: account.id,
      delivery: {
        email: 'new@example.com',
        origin: 'http://localhost',
      },
    });
    const provisioning = provisioner.calls[0];
    expect('verificationTokenHash' in provisioning).toBe(true);
    if (!('verificationTokenHash' in provisioning)) return;
    expect(hashToken(event.delivery.token)).toBe(
      provisioning.verificationTokenHash,
    );
    expect(account).not.toHaveProperty('companyId');
    expect(account).not.toHaveProperty('role');
    expect(account).not.toHaveProperty('passwordHash');
  });

  it('does not emit when atomic provisioning fails', async () => {
    provisioner.error = new Error('rollback');

    await expect(
      service.register('a@example.com', 'password123'),
    ).rejects.toThrow('rollback');
    expect(events.emit).not.toHaveBeenCalled();
  });
});
