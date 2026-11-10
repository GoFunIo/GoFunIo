import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import type { SessionPrincipal } from '../users/session-principal';
import { requireCompanyId } from '../users/session-principal';
import { CLOCK, type Clock } from '../common/clock';
import { UpdateVehicleDeadlineAlertPolicyDto } from './dtos/update-vehicle-deadline-alert-policy.dto';
import { VehicleDeadlineAlertPolicy } from './vehicle-deadline-alert-policy.entity';
import { NotificationChangeRelay } from '../notification-changes/notification-change-relay';
import { VehicleDeadlineCustomKind } from '../vehicle-deadline-kinds/vehicle-deadline-custom-kind.entity';
import { isBuiltInVehicleDeadlineKind } from '../vehicle-deadline-kinds/vehicle-deadline-kind-catalog';
import {
  requireAdminMembership,
  requirePolicyForUpdate,
} from './alert-policy-transaction';

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
      await requireAdminMembership(manager, companyId, actor.id);
      const policy = await requirePolicyForUpdate(manager, companyId);
      await this.assertKnownKinds(
        manager,
        companyId,
        body.enabledDeadlineKinds ?? [],
      );
      applyPolicyChanges(policy, body, this.clock.now());
      const saved = await manager.save(policy);
      await this.notificationChanges.record(manager, {
        companyId,
        userId: null,
      });
      return saved;
    });
  }

  private async assertKnownKinds(
    manager: EntityManager,
    companyId: string,
    kinds: string[],
  ): Promise<void> {
    const customKinds = kinds.filter(
      (kind) => !isBuiltInVehicleDeadlineKind(kind),
    );
    if (!customKinds.length) return;
    const known = await manager.countBy(VehicleDeadlineCustomKind, {
      companyId,
      id: In(customKinds),
    });
    if (known !== customKinds.length) {
      throw new BadRequestException('Unsupported deadline kind');
    }
  }
}
