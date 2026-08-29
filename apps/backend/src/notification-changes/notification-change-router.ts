import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIVE_MEMBERSHIP_POLICY,
  type ActiveMembershipPolicy,
} from '../users/active-membership-policy';
import { NotificationChangeRelay } from './notification-change-relay';
import { NotificationStreamRegistry } from './notification-stream-registry';

@Injectable()
export class NotificationChangeRouter {
  constructor(
    private readonly relay: NotificationChangeRelay,
    private readonly streams: NotificationStreamRegistry,
    @Inject(ACTIVE_MEMBERSHIP_POLICY)
    private readonly memberships: ActiveMembershipPolicy,
  ) {}

  async route(changeId: string): Promise<void> {
    const change = await this.relay.find(changeId);
    if (!change) return;
    const scope = { companyId: change.companyId, userId: change.userId };
    if (
      change.userId &&
      !(await this.memberships.isActive({
        companyId: change.companyId,
        userId: change.userId,
      }))
    ) {
      this.streams.close(scope);
      return;
    }
    this.streams.invalidate(scope);
  }
}
