import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { NotificationChangeRouter } from './notification-change-router';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RETRY_MS = 5_000;

interface PgNotification {
  channel: string;
  payload?: string;
}

interface PgConnection {
  on(event: 'notification', listener: (value: PgNotification) => void): void;
  on(event: 'error' | 'end', listener: () => void): void;
  removeListener(
    event: 'notification',
    listener: (value: PgNotification) => void,
  ): void;
  removeListener(event: 'error' | 'end', listener: () => void): void;
}

@Injectable()
export class NotificationChangeListener
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationChangeListener.name);
  private runner?: QueryRunner;
  private connection?: PgConnection;
  private retry?: NodeJS.Timeout;
  private stopping = false;
  private readonly inFlightHandlers = new Set<Promise<void>>();
  private readonly receive = (notification: PgNotification) => {
    const handler = this.handle(
      notification.payload,
      notification.channel,
    ).finally(() => this.inFlightHandlers.delete(handler));
    this.inFlightHandlers.add(handler);
  };
  private readonly connectionError = () => {
    void this.reconnect('connection_error');
  };
  private readonly connectionEnded = () => {
    void this.reconnect('connection_ended');
  };

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly router: NotificationChangeRouter,
  ) {}

  onApplicationBootstrap(): void {
    void this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    if (this.retry) clearTimeout(this.retry);
    this.detach();
    await Promise.allSettled(this.inFlightHandlers);
    await this.release();
  }

  private async connect(): Promise<void> {
    if (this.stopping || this.runner) return;
    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();
      if (this.stopping) {
        await runner.release();
        return;
      }
      const connection = (
        runner as QueryRunner & { databaseConnection: PgConnection }
      ).databaseConnection;
      this.runner = runner;
      this.connection = connection;
      connection.on('notification', this.receive);
      connection.on('error', this.connectionError);
      connection.on('end', this.connectionEnded);
      await runner.query('LISTEN notification_changes');
    } catch (error) {
      if (this.runner === runner) {
        this.detach();
        this.runner = undefined;
      }
      await runner.release().catch(() => undefined);
      this.logFailure('notification_change_listener_start_failed', error);
      this.scheduleRetry();
    }
  }

  async handle(
    payload: string | undefined,
    channel = 'notification_changes',
  ): Promise<void> {
    if (channel !== 'notification_changes' || !payload || !UUID.test(payload)) {
      this.logger.warn(
        JSON.stringify({
          event: 'notification_change_listener_payload_ignored',
        }),
      );
      return;
    }
    try {
      await this.router.route(payload);
    } catch (error) {
      this.logFailure('notification_change_lookup_failed', error);
    }
  }

  private async reconnect(event: string): Promise<void> {
    this.logger.warn(JSON.stringify({ event }));
    await this.release();
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    if (this.stopping || this.retry) return;
    this.retry = setTimeout(() => {
      this.retry = undefined;
      void this.connect();
    }, RETRY_MS);
    this.retry.unref();
  }

  private async release(): Promise<void> {
    const runner = this.runner;
    this.runner = undefined;
    if (!runner) return;
    this.detach();
    await runner.query('UNLISTEN notification_changes').catch(() => undefined);
    await runner.release().catch(() => undefined);
  }

  private detach(): void {
    const connection = this.connection;
    this.connection = undefined;
    if (!connection) return;
    connection.removeListener('notification', this.receive);
    connection.removeListener('error', this.connectionError);
    connection.removeListener('end', this.connectionEnded);
  }

  private logFailure(event: string, error: unknown): void {
    this.logger.error(
      JSON.stringify({
        event,
        errorType:
          error instanceof Error ? error.constructor.name : 'UnknownError',
      }),
    );
  }
}
