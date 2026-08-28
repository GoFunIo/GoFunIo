import { Injectable } from '@nestjs/common';
import type { EventEmitter } from 'events';
import type { NotificationStreamScope } from './notification-change-scope';
import { NotificationStreamRegistry } from './notification-stream-registry';

const HEARTBEAT_MS = 25_000;
const MAX_LIFETIME_MS = 15 * 60 * 1000;
const RECONNECT_MS = 5_000;

type SseRequest = Pick<EventEmitter, 'once' | 'removeListener'>;

interface SseResponse {
  setHeader(name: string, value: string): void;
  flushHeaders(): void;
  write(value: string): unknown;
  end(): void;
}

@Injectable()
export class NotificationSseTransport {
  constructor(private readonly registry: NotificationStreamRegistry) {}

  open(
    scope: NotificationStreamScope,
    request: SseRequest,
    response: SseResponse,
  ): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    response.write(`retry: ${RECONNECT_MS}\n\n`);

    let closed = false;
    let unregister: () => void = () => undefined;
    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      clearTimeout(maxLifetime);
      request.removeListener('close', close);
      unregister();
      response.end();
    };
    unregister = this.registry.register(scope, {
      invalidate: () => {
        if (!closed) {
          response.write('event: notification.changed\ndata: {}\n\n');
        }
      },
      close,
    });
    const heartbeat = setInterval(() => {
      if (!closed) response.write(': heartbeat\n\n');
    }, HEARTBEAT_MS);
    heartbeat.unref();
    const maxLifetime = setTimeout(close, MAX_LIFETIME_MS);
    maxLifetime.unref();
    request.once('close', close);
  }
}
