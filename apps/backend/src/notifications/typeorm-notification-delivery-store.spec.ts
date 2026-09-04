import type { DataSource } from 'typeorm';
import type { FrontendOrigins } from '../common/frontend-origins';
import type { NotificationDeliveryTypeAdapter } from './notification-delivery-type-adapter';
import { DeliveryCancellationReason } from './notification-delivery-policy';
import { NotificationType } from './notification.entity';
import { TypeOrmNotificationDeliveryStore } from './typeorm-notification-delivery-store';

const id = 'delivery-1';
const claimedAt = new Date('2024-01-01T00:00:00Z');
const now = new Date('2024-01-02T00:00:00Z');

describe('TypeOrmNotificationDeliveryStore prepare', () => {
  it('returns null when the delivery row is no longer claimable', async () => {
    const { store } = setup({ row: undefined });

    await expect(store.prepare(id, claimedAt, now)).resolves.toBeNull();
  });

  it('throws when no adapter handles the notification type', async () => {
    const { store } = setup({ row: baseRow(), adapters: [] });

    await expect(store.prepare(id, claimedAt, now)).rejects.toThrow(
      'Missing delivery adapter for VEHICLE_DEADLINE_REACHED',
    );
  });

  it('cancels when the notification is no longer valid', async () => {
    const { store } = setup({ row: baseRow({ invalidatedAt: new Date() }) });

    await expect(store.prepare(id, claimedAt, now)).resolves.toEqual({
      kind: 'cancel',
      reason: DeliveryCancellationReason.NOTIFICATION_INVALID,
    });
  });

  it('cancels when the membership is no longer active', async () => {
    const { store } = setup({
      row: baseRow({ membershipStatus: 'removed' }),
    });

    await expect(store.prepare(id, claimedAt, now)).resolves.toEqual({
      kind: 'cancel',
      reason: DeliveryCancellationReason.MEMBERSHIP_INACTIVE,
    });
  });

  it('cancels when the recipient source has been revoked', async () => {
    const { store } = setup({ row: baseRow({ revokedAt: new Date() }) });

    await expect(store.prepare(id, claimedAt, now)).resolves.toEqual({
      kind: 'cancel',
      reason: DeliveryCancellationReason.SOURCE_UNAUTHORIZED,
    });
  });

  it('cancels when there is no captured or verified address', async () => {
    const { store } = setup({
      row: baseRow({ recipientAddress: null, email: null }),
    });

    await expect(store.prepare(id, claimedAt, now)).resolves.toEqual({
      kind: 'cancel',
      reason: DeliveryCancellationReason.NO_VERIFIED_ADDRESS,
    });
  });

  it('sends immediately when the recipient address is already captured', async () => {
    const { store, updateExecute } = setup({
      row: baseRow({ recipientAddress: 'set@example.com' }),
    });

    await expect(store.prepare(id, claimedAt, now)).resolves.toEqual({
      kind: 'send',
      to: 'set@example.com',
      subject: 'subject',
      text: 'text',
      html: 'html',
    });
    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('captures a newly verified address before sending', async () => {
    const { store, updateExecute } = setup({
      row: baseRow({
        recipientAddress: null,
        email: 'verified@example.com',
        emailVerifiedAt: new Date('2023-12-01T00:00:00Z'),
        userDeletedAt: null,
      }),
      captureAffected: 1,
    });

    await expect(store.prepare(id, claimedAt, now)).resolves.toEqual({
      kind: 'send',
      to: 'verified@example.com',
      subject: 'subject',
      text: 'text',
      html: 'html',
    });
    expect(updateExecute).toHaveBeenCalledTimes(1);
  });

  it('returns null when another worker captured the address first', async () => {
    const { store } = setup({
      row: baseRow({
        recipientAddress: null,
        email: 'verified@example.com',
        emailVerifiedAt: new Date('2023-12-01T00:00:00Z'),
        userDeletedAt: null,
      }),
      captureAffected: 0,
    });

    await expect(store.prepare(id, claimedAt, now)).resolves.toBeNull();
  });

  it('throws when the adapter reports eligibility but no rendered email', async () => {
    const { store } = setup({
      row: baseRow({ recipientAddress: 'set@example.com' }),
      noRendered: true,
    });

    await expect(store.prepare(id, claimedAt, now)).rejects.toThrow(
      'Delivery adapter did not render VEHICLE_DEADLINE_REACHED',
    );
  });
});

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id,
    companyId: 'company-1',
    recipientAddress: 'set@example.com',
    notificationId: 'notification-1',
    notificationType: NotificationType.VEHICLE_DEADLINE_REACHED,
    rendererVersion: 1,
    invalidatedAt: null,
    expiresAt: null,
    revokedAt: null,
    membershipId: 'membership-1',
    membershipStatus: 'active',
    userId: 'user-1',
    email: null,
    emailVerifiedAt: null,
    userDeletedAt: null,
    emailMode: null,
    ...overrides,
  };
}

function setup(options: {
  row: Record<string, unknown> | undefined;
  adapters?: NotificationDeliveryTypeAdapter[];
  captureAffected?: number;
  noRendered?: boolean;
}) {
  const rows = options.row ? [options.row] : [];
  const updateExecute = jest
    .fn()
    .mockResolvedValue({ affected: options.captureAffected ?? 1 });
  const updateBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: updateExecute,
  };
  const manager = {
    query: jest.fn().mockResolvedValue(rows),
    createQueryBuilder: jest.fn().mockReturnValue(updateBuilder),
  };
  const dataSource = {
    transaction: jest.fn(
      async (callback: (value: typeof manager) => Promise<unknown>) =>
        callback(manager),
    ),
  };
  const defaultAdapter: NotificationDeliveryTypeAdapter = {
    type: NotificationType.VEHICLE_DEADLINE_REACHED,
    prepare: jest.fn().mockResolvedValue({
      sourceValid: true,
      sourceAuthorized: true,
      rendered: options.noRendered
        ? undefined
        : { subject: 'subject', text: 'text', html: 'html' },
    }),
  };
  const frontendOrigins: Pick<FrontendOrigins, 'resolveLinkBase'> = {
    resolveLinkBase: () => 'https://app.example.com',
  };
  const store = new TypeOrmNotificationDeliveryStore(
    dataSource as unknown as DataSource,
    options.adapters ?? [defaultAdapter],
    frontendOrigins as FrontendOrigins,
  );
  return { store, manager, updateExecute };
}
