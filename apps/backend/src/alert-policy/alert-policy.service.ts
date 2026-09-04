import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { SessionPrincipal } from '../users/session-principal';
import { requireCompanyId } from '../users/session-principal';
import { Membership } from '../users/membership.entity';
import { isWorkspaceAdmin } from '../users/membership-role';
import { CLOCK, type Clock } from '../common/clock';
import { UpdateVehicleDeadlineAlertPolicyDto } from './dtos/update-vehicle-deadline-alert-policy.dto';
import { VehicleDeadlineAlertPolicy } from './vehicle-deadline-alert-policy.entity';
import { NotificationChangeRelay } from '../notification-changes/notification-change-relay';

function applyPolicyChanges(
  policy: VehicleDeadlineAlertPolicy,
  body: UpdateVehicleDeadlineAlertPolicyDto,
  now: Date,
): void {
  if (body.enabledDeadlineKinds !== undefined) {
    policy.enabledDeadlineKinds = body.enabledDeadlineKinds;
  }
  if (body.leadDays !== undefined) {
    policy.leadDays = [...body.leadDays].sort((left, right) => right - left);
  }
  if (body.timeZone !== undefined) policy.timeZone = body.timeZone;
  policy.activatedAt = now;
}

@Injectable()
export class AlertPolicyService {
  constructor(
    @InjectRepository(VehicleDeadlineAlertPolicy)
    private readonly policies: Repository<VehicleDeadlineAlertPolicy>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly notificationChanges: NotificationChangeRelay,
  ) {}

  async get(actor: SessionPrincipal): Promise<VehicleDeadlineAlertPolicy> {
    const policy = await this.policies.findOneBy({
      companyId: requireCompanyId(actor),
    });
    if (!policy) throw new NotFoundException('Alert policy not found');
    return policy;
  }

  update(
    actor: SessionPrincipal,
    body: UpdateVehicleDeadlineAlertPolicyDto,
  ): Promise<VehicleDeadlineAlertPolicy> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    const companyId = requireCompanyId(actor);
    return this.policies.manager.transaction(async (manager) => {
      await this.requireAdminMembership(manager, companyId, actor.id);
      const policy = await this.requirePolicy(manager, companyId);
      applyPolicyChanges(policy, body, this.clock.now());
      const saved = await manager.save(policy);
      await this.notificationChanges.record(manager, {
        companyId,
        userId: null,
      });
      return saved;
    });
  }

  private async requireAdminMembership(
    manager: EntityManager,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const membership = await manager.findOne(Membership, {
      where: { companyId, userId, status: 'active' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!membership || !isWorkspaceAdmin(membership.role)) {
      throw new ForbiddenException();
    }
  }

  private async requirePolicy(
    manager: EntityManager,
    companyId: string,
  ): Promise<VehicleDeadlineAlertPolicy> {
    const policy = await manager.findOne(VehicleDeadlineAlertPolicy, {
      where: { companyId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!policy) throw new NotFoundException('Alert policy not found');
    return policy;
  }
}
