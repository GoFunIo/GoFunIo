import type { DataSource } from 'typeorm';
import { NotificationChangeListener } from './notification-change-listener';
import type { NotificationChangeRouter } from './notification-change-router';

describe('NotificationChangeListener', () => {
  it('ignores payloads that are not an opaque UUID', async () => {
    const router = { route: jest.fn() };
    const listener = new NotificationChangeListener(
      {} as DataSource,
      router as unknown as NotificationChangeRouter,
    );

    await listener.handle('not-a-uuid');
    await listener.handle(
      '11111111-1111-4111-8111-111111111111 with-domain-content',
    );
    await listener.handle(undefined);

    expect(router.route).not.toHaveBeenCalled();
  });

  it('contains relay lookup failures and can process the next change', async () => {
    const router = {
      route: jest
        .fn()
        .mockRejectedValueOnce(new Error('lookup unavailable'))
        .mockResolvedValueOnce(undefined),
    };
    const listener = new NotificationChangeListener(
      {} as DataSource,
      router as unknown as NotificationChangeRouter,
    );
    const first = '11111111-1111-4111-8111-111111111111';
    const second = '22222222-2222-4222-8222-222222222222';

    await expect(listener.handle(first)).resolves.toBeUndefined();
    await expect(listener.handle(second)).resolves.toBeUndefined();

    expect(router.route).toHaveBeenNthCalledWith(1, first);
    expect(router.route).toHaveBeenNthCalledWith(2, second);
  });
});
