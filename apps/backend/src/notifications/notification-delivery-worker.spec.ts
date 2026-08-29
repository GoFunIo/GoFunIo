import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ResendHttpError } from '../mail/resend.client';
import { NodeEnv, type EnvVars } from '../config/env.validation';
import { DeliveryCancellationReason } from './notification-delivery-policy';
import {
  NotificationDeliveryWorker,
  type NotificationDeliveryJob,
  type NotificationDeliveryStore,
  type PreparedNotificationDelivery,
} from './notification-delivery-worker';
import type { NotificationEmailSender } from './notification-email-sender';

const now = new Date('2026-08-28T10:00:00.000Z');
const prepared: PreparedNotificationDelivery = {
  kind: 'send',
  to: 'captured@example.com',
  subject: 'Termin OC pojazdu WX1234',
  text: 'Treść',
  html: '<p>Treść</p>',
};

class FakeDeliveryStore implements NotificationDeliveryStore {
  jobs: NotificationDeliveryJob[] = [];
  preparation: PreparedNotificationDelivery | null = prepared;
  claim = jest.fn(() => Promise.resolve(this.jobs.splice(0)));
  prepare = jest.fn(() => Promise.resolve(this.preparation));
  completeSent = jest.fn(() => Promise.resolve(true));
  cancel = jest.fn(() => Promise.resolve(true));
  retry = jest.fn(() => Promise.resolve(true));
  fail = jest.fn(() => Promise.resolve(true));
}

const testConfig = {
  get: jest.fn(() => NodeEnv.Test),
} as unknown as ConfigService<EnvVars, true>;

function job(attempts = 0): NotificationDeliveryJob {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    attempts,
    claimedAt: now,
    recoveredLease: attempts > 0,
  };
}

function setup(
  send: jest.MockedFunction<NotificationEmailSender['send']> = jest.fn<
    ReturnType<NotificationEmailSender['send']>,
    Parameters<NotificationEmailSender['send']>
  >(() => Promise.resolve({ providerMessageId: 'email_123' })),
) {
  const store = new FakeDeliveryStore();
  store.jobs.push(job());
  const sender: NotificationEmailSender = { send };
  return {
    store,
    sender,
    send,
    worker: new NotificationDeliveryWorker(store, sender, testConfig),
  };
}

describe('NotificationDeliveryWorker', () => {
  it('sends a prepared job with its stable Delivery UUID and completes by lease ownership', async () => {
    const { worker, store, send } = setup();
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await worker.processDue(now);

    expect(send).toHaveBeenCalledWith({
      to: 'captured@example.com',
      subject: 'Termin OC pojazdu WX1234',
      text: 'Treść',
      html: '<p>Treść</p>',
      idempotencyKey: job().id,
    });
    expect(store.completeSent).toHaveBeenCalledWith({
      id: job().id,
      claimedAt: now,
      attempts: 1,
      providerMessageId: 'email_123',
      sentAt: now,
    });
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'notification_delivery_sent',
        deliveryId: job().id,
        attempts: 1,
      }),
    );
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain('captured@example.com');
    expect(logged).not.toContain('<p>Treść</p>');
    expect(logged).not.toContain('email_123');
    log.mockRestore();
  });

  it('cancels an ineligible job without provider I/O', async () => {
    const { worker, store, send } = setup();
    store.preparation = {
      kind: 'cancel',
      reason: DeliveryCancellationReason.PREFERENCE_DISABLED,
    };

    await worker.processDue(now);

    expect(send).not.toHaveBeenCalled();
    expect(store.cancel).toHaveBeenCalledWith({
      id: job().id,
      claimedAt: now,
      reason: DeliveryCancellationReason.PREFERENCE_DISABLED,
      completedAt: now,
    });
  });

  it('does nothing after lease ownership is lost during preparation', async () => {
    const { worker, store, send } = setup();
    store.preparation = null;

    await worker.processDue(now);

    expect(send).not.toHaveBeenCalled();
    expect(store.cancel).not.toHaveBeenCalled();
    expect(store.completeSent).not.toHaveBeenCalled();
  });

  it('retries transient failures with capped exponential backoff and sanitized diagnostics', async () => {
    const { worker, store } = setup(
      jest.fn<
        ReturnType<NotificationEmailSender['send']>,
        Parameters<NotificationEmailSender['send']>
      >(() => Promise.reject(new ResendHttpError(503))),
    );
    store.jobs[0] = job(11);

    await worker.processDue(now);

    expect(store.retry).toHaveBeenCalledWith({
      id: job().id,
      claimedAt: now,
      attempts: 12,
      nextAttemptAt: new Date('2026-08-29T10:00:00.000Z'),
      lastError: 'provider_http_503',
    });
  });

  it('fails permanently on provider 4xx and never logs message content or address', async () => {
    const { worker, store } = setup(
      jest.fn<
        ReturnType<NotificationEmailSender['send']>,
        Parameters<NotificationEmailSender['send']>
      >(() => Promise.reject(new ResendHttpError(422))),
    );
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await worker.processDue(now);

    expect(store.fail).toHaveBeenCalledWith({
      id: job().id,
      claimedAt: now,
      attempts: 1,
      lastError: 'provider_http_422',
      completedAt: now,
    });
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain('captured@example.com');
    expect(logged).not.toContain('<p>Treść</p>');
    error.mockRestore();
  });

  it('does not report retry or failure after lease ownership is lost', async () => {
    const retrySetup = setup(
      jest.fn<
        ReturnType<NotificationEmailSender['send']>,
        Parameters<NotificationEmailSender['send']>
      >(() => Promise.reject(new ResendHttpError(503))),
    );
    retrySetup.store.retry.mockResolvedValueOnce(false);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await retrySetup.worker.processDue(now);

    expect(
      warn.mock.calls.some(([entry]) =>
        String(entry).includes('notification_delivery_retry'),
      ),
    ).toBe(false);
    warn.mockRestore();

    const failureSetup = setup(
      jest.fn<
        ReturnType<NotificationEmailSender['send']>,
        Parameters<NotificationEmailSender['send']>
      >(() => Promise.reject(new ResendHttpError(422))),
    );
    failureSetup.store.fail.mockResolvedValueOnce(false);
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await failureSetup.worker.processDue(now);

    expect(
      error.mock.calls.some(([entry]) =>
        String(entry).includes('notification_delivery_failed'),
      ),
    ).toBe(false);
    error.mockRestore();
  });

  it('does not overlap cycles in one process', async () => {
    const { worker, store } = setup();
    let release!: (jobs: NotificationDeliveryJob[]) => void;
    store.claim.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve)),
    );

    const first = worker.processDue(now);
    const second = worker.processDue(now);
    await Promise.resolve();
    expect(store.claim).toHaveBeenCalledTimes(1);
    release([]);
    await Promise.all([first, second]);
  });

  it('keeps scheduling disabled in tests', () => {
    const { worker, store } = setup();
    worker.onApplicationBootstrap();
    expect(store.claim).not.toHaveBeenCalled();
  });

  it('does not block startup and contains a failed startup cycle', async () => {
    const { store, sender } = setup();
    store.claim.mockRejectedValueOnce(new Error('database unavailable'));
    const productionConfig = {
      get: jest.fn(() => NodeEnv.Production),
    } as unknown as ConfigService<EnvVars, true>;
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const worker = new NotificationDeliveryWorker(
      store,
      sender,
      productionConfig,
    );

    expect(worker.onApplicationBootstrap()).toBeUndefined();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('notification_delivery_cycle_failed'),
    );
    await worker.onApplicationShutdown();
    error.mockRestore();
  });

  it('coalesces committed-Delivery wakeups into one local cycle', async () => {
    const { store, sender } = setup();
    const productionConfig = {
      get: jest.fn(() => NodeEnv.Production),
    } as unknown as ConfigService<EnvVars, true>;
    const worker = new NotificationDeliveryWorker(
      store,
      sender,
      productionConfig,
    );

    worker.onDeliveryCommitted();
    worker.onDeliveryCommitted();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(store.claim).toHaveBeenCalledTimes(1);
  });

  it('runs one follow-up cycle when a Delivery commits during active work', async () => {
    const { store, sender } = setup();
    const productionConfig = {
      get: jest.fn(() => NodeEnv.Production),
    } as unknown as ConfigService<EnvVars, true>;
    const worker = new NotificationDeliveryWorker(
      store,
      sender,
      productionConfig,
    );
    let release!: (jobs: NotificationDeliveryJob[]) => void;
    store.claim.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve)),
    );

    const active = worker.processDue(now);
    worker.onDeliveryCommitted();
    release([]);
    await active;
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(store.claim).toHaveBeenCalledTimes(2);
  });
});
