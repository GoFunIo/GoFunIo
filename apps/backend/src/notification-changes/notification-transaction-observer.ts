import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type {
  EntityManager,
  EntitySubscriberInterface,
  TransactionCommitEvent,
  TransactionRollbackEvent,
} from 'typeorm';
import { DataSource } from 'typeorm';

type NotificationOperationalEvent = Readonly<Record<string, string | number>>;

interface NotificationTransactionData {
  notificationOperationalEvents?: NotificationOperationalEvent[];
}

export function recordNotificationOperationalEvent(
  manager: EntityManager,
  event: NotificationOperationalEvent,
): void {
  const runner = manager.queryRunner;
  if (!runner?.isTransactionActive) {
    throw new Error('Notification operational events require a transaction');
  }
  const data = runner.data as NotificationTransactionData;
  (data.notificationOperationalEvents ??= []).push(event);
}

@Injectable()
export class NotificationTransactionObserver
  implements EntitySubscriberInterface, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationTransactionObserver.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  afterTransactionCommit({ queryRunner }: TransactionCommitEvent): void {
    const data = queryRunner.data as NotificationTransactionData;
    for (const event of data.notificationOperationalEvents ?? []) {
      this.logger.log(JSON.stringify(event));
    }
    delete data.notificationOperationalEvents;
  }

  afterTransactionRollback({ queryRunner }: TransactionRollbackEvent): void {
    const data = queryRunner.data as NotificationTransactionData;
    delete data.notificationOperationalEvents;
  }

  onApplicationShutdown(): void {
    const index = this.dataSource.subscribers.indexOf(this);
    if (index >= 0) this.dataSource.subscribers.splice(index, 1);
  }
}
