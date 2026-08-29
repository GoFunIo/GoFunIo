import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLOCK, type Clock } from '../common/clock';
import { EnvVars, NodeEnv } from '../config/env.validation';
import { NotificationChangeRelay } from './notification-change-relay';

const RETENTION_MS = 60 * 60 * 1000;
const CLEANUP_MS = 15 * 60 * 1000;

@Injectable()
export class NotificationChangeCleanup
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationChangeCleanup.name);
  private timer?: NodeJS.Timeout;
  private active?: Promise<void>;

  constructor(
    private readonly relay: NotificationChangeRelay,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV') === NodeEnv.Test) return;
    void this.processDue();
    this.timer = setInterval(() => void this.processDue(), CLEANUP_MS);
    this.timer.unref();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.active;
  }

  processDue(): Promise<void> {
    if (this.active) return this.active;
    const active = this.run().finally(() => {
      if (this.active === active) this.active = undefined;
    });
    this.active = active;
    return active;
  }

  private async run(): Promise<void> {
    try {
      await this.relay.purgeExpired(
        new Date(this.clock.now().getTime() - RETENTION_MS),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'notification_change_cleanup_failed',
          errorType:
            error instanceof Error ? error.constructor.name : 'UnknownError',
        }),
      );
    }
  }
}
