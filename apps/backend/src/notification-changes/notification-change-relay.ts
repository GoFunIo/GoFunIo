import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThan } from 'typeorm';
import type { NotificationChangeScope } from './notification-change-scope';
import { NotificationChange } from './notification-change.entity';

@Injectable()
export class NotificationChangeRelay {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async record(
    manager: EntityManager,
    scope: NotificationChangeScope,
  ): Promise<string> {
    const change = await manager.save(
      manager.create(NotificationChange, {
        companyId: scope.companyId,
        userId: scope.userId,
      }),
    );
    await manager.query(`SELECT pg_notify('notification_changes', $1)`, [
      change.id,
    ]);
    return change.id;
  }

  find(id: string): Promise<NotificationChange | null> {
    return this.dataSource.manager.findOneBy(NotificationChange, { id });
  }

  async purgeExpired(cutoff: Date): Promise<number> {
    const result = await this.dataSource.manager.delete(NotificationChange, {
      createdAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }
}
