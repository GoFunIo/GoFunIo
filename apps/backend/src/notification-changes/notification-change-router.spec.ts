import type { NotificationChangeRelay } from './notification-change-relay';
import { NotificationChangeRouter } from './notification-change-router';
import type { NotificationStreamRegistry } from './notification-stream-registry';

describe('NotificationChangeRouter', () => {
  const scope = {
    companyId: '11111111-1111-4111-8111-111111111111',
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };

  function setup(active: boolean) {
    const relay = {
      find: jest.fn().mockResolvedValue({ id: 'change', ...scope }),
    };
    const streams = { invalidate: jest.fn(), close: jest.fn() };
    const memberships = { isActive: jest.fn().mockResolvedValue(active) };
    const router = new NotificationChangeRouter(
      relay as unknown as NotificationChangeRelay,
      streams as unknown as NotificationStreamRegistry,
      memberships,
    );
    return { memberships, router, streams };
  }

  it('delegates User-scoped authorization to the Membership policy', async () => {
    const { memberships, router, streams } = setup(true);

    await router.route('change');

    expect(memberships.isActive).toHaveBeenCalledWith(scope);
    expect(streams.invalidate).toHaveBeenCalledWith(scope);
  });

  it('closes the targeted stream when Membership is inactive', async () => {
    const { router, streams } = setup(false);

    await router.route('change');

    expect(streams.close).toHaveBeenCalledWith(scope);
    expect(streams.invalidate).not.toHaveBeenCalled();
  });
});
