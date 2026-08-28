import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import type {
  NotificationChangeScope,
  NotificationStreamScope,
} from './notification-change-scope';

export interface NotificationStreamConnection {
  invalidate(): void;
  close(): void;
}

@Injectable()
export class NotificationStreamRegistry implements OnApplicationShutdown {
  private readonly logger = new Logger(NotificationStreamRegistry.name);
  private readonly connections = new Map<
    string,
    Set<NotificationStreamConnection>
  >();

  register(
    scope: NotificationStreamScope,
    connection: NotificationStreamConnection,
  ): () => void {
    const key = this.key(scope.companyId, scope.userId);
    const scoped = this.connections.get(key) ?? new Set();
    scoped.add(connection);
    this.connections.set(key, scoped);
    this.logCount('notification_sse_connected');
    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      scoped.delete(connection);
      if (!scoped.size) this.connections.delete(key);
      this.logCount('notification_sse_disconnected');
    };
  }

  invalidate(scope: NotificationChangeScope): void {
    for (const connection of this.matching(scope)) connection.invalidate();
  }

  close(scope: NotificationChangeScope): void {
    const matching = this.matching(scope);
    if (scope.userId) {
      this.connections.delete(this.key(scope.companyId, scope.userId));
    } else {
      const prefix = `${scope.companyId}:`;
      for (const key of this.connections.keys()) {
        if (key.startsWith(prefix)) this.connections.delete(key);
      }
    }
    for (const connection of matching) connection.close();
  }

  activeCount(): number {
    let count = 0;
    for (const scoped of this.connections.values()) count += scoped.size;
    return count;
  }

  onApplicationShutdown(): void {
    const active = [...this.connections.values()].flatMap((scoped) => [
      ...scoped,
    ]);
    for (const connection of active) connection.close();
    this.connections.clear();
  }

  private matching(
    scope: NotificationChangeScope,
  ): NotificationStreamConnection[] {
    if (scope.userId) {
      return [
        ...(this.connections.get(this.key(scope.companyId, scope.userId)) ??
          []),
      ];
    }
    const prefix = `${scope.companyId}:`;
    return [...this.connections.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .flatMap(([, connections]) => [...connections]);
  }

  private key(companyId: string, userId: string): string {
    return `${companyId}:${userId}`;
  }

  private logCount(event: string): void {
    this.logger.log(
      JSON.stringify({ event, activeConnections: this.activeCount() }),
    );
  }
}
