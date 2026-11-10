import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import {
  requireAdminMembership,
  requirePolicyForUpdate,
} from '../alert-policy/alert-policy-transaction';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { ConflictCode, conflictException } from '../common/conflict';
import { NotificationChangeRelay } from '../notification-changes/notification-change-relay';
import type { SessionPrincipal } from '../users/session-principal';
import { requireCompanyId } from '../users/session-principal';
import type { SaveVehicleDeadlineKindDto } from './dtos/save-vehicle-deadline-kind.dto';
import {
  BUILT_IN_VEHICLE_DEADLINE_LABELS,
  MAX_CUSTOM_VEHICLE_DEADLINE_KINDS,
} from './vehicle-deadline-kind-catalog';
import { VehicleDeadlineCustomKind } from './vehicle-deadline-custom-kind.entity';

export interface VehicleDeadlineKindView {
  key: string;
  label: string;
  builtIn: boolean;
}

const LABEL_INDEX = 'IDX_vehicle_deadline_custom_kinds_company_label';

@Injectable()
export class VehicleDeadlineKindsService {
  constructor(
    @InjectRepository(VehicleDeadlineCustomKind)
    private readonly kinds: Repository<VehicleDeadlineCustomKind>,
    private readonly notificationChanges: NotificationChangeRelay,
  ) {}

  async list(actor: SessionPrincipal): Promise<VehicleDeadlineKindView[]> {
    const custom = await this.kinds.find({
      where: { companyId: requireCompanyId(actor) },
      order: { label: 'ASC' },
    });
    return [
      ...Object.values(VehicleDeadlineKind).map((key) => ({
        key,
        label: BUILT_IN_VEHICLE_DEADLINE_LABELS[key],
        builtIn: true,
      })),
      ...custom.map((kind) => this.view(kind)),
    ];
  }

  create(
    actor: SessionPrincipal,
    body: SaveVehicleDeadlineKindDto,
  ): Promise<VehicleDeadlineKindView> {
    const companyId = requireCompanyId(actor);
    return this.withLabelConflict(() =>
      this.kinds.manager.transaction(async (manager) => {
        await requireAdminMembership(manager, companyId, actor.id);
        const policy = await requirePolicyForUpdate(manager, companyId);
        const count = await manager.countBy(VehicleDeadlineCustomKind, {
          companyId,
        });
        if (count >= MAX_CUSTOM_VEHICLE_DEADLINE_KINDS) {
          throw conflictException(
            'Custom deadline kind limit reached',
            ConflictCode.VEHICLE_DEADLINE_KIND_LIMIT_REACHED,
          );
        }
        const kind = await manager.save(
          manager.create(VehicleDeadlineCustomKind, {
            companyId,
            label: body.label,
          }),
        );
        policy.enabledDeadlineKinds = [...policy.enabledDeadlineKinds, kind.id];
        await manager.save(policy);
        await this.notificationChanges.record(manager, {
          companyId,
          userId: null,
        });
        return this.view(kind);
      }),
    );
  }

  rename(
    actor: SessionPrincipal,
    id: string,
    body: SaveVehicleDeadlineKindDto,
  ): Promise<VehicleDeadlineKindView> {
    const companyId = requireCompanyId(actor);
    return this.withLabelConflict(() =>
      this.kinds.manager.transaction(async (manager) => {
        await requireAdminMembership(manager, companyId, actor.id);
        const kind = await this.requireKind(manager, companyId, id);
        kind.label = body.label;
        const saved = await manager.save(kind);
        await this.notificationChanges.record(manager, {
          companyId,
          userId: null,
        });
        return this.view(saved);
      }),
    );
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    const companyId = requireCompanyId(actor);
    await this.kinds.manager.transaction(async (manager) => {
      await requireAdminMembership(manager, companyId, actor.id);
      const policy = await requirePolicyForUpdate(manager, companyId);
      await this.requireKind(manager, companyId, id);
      await manager.delete(VehicleDeadlineCustomKind, { id, companyId });
      policy.enabledDeadlineKinds = policy.enabledDeadlineKinds.filter(
        (kind) => kind !== id,
      );
      await manager.save(policy);
      await this.notificationChanges.record(manager, {
        companyId,
        userId: null,
      });
    });
  }

  private async requireKind(
    manager: EntityManager,
    companyId: string,
    id: string,
  ): Promise<VehicleDeadlineCustomKind> {
    const kind = await manager.findOne(VehicleDeadlineCustomKind, {
      where: { id, companyId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!kind) throw new NotFoundException('Deadline kind not found');
    return kind;
  }

  private view(kind: VehicleDeadlineCustomKind): VehicleDeadlineKindView {
    return { key: kind.id, label: kind.label, builtIn: false };
  }

  private async withLabelConflict<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { constraint?: string } | undefined)
          ?.constraint === LABEL_INDEX
      ) {
        throw conflictException(
          'Deadline kind label already in use',
          ConflictCode.VEHICLE_DEADLINE_KIND_LABEL_IN_USE,
          'label',
        );
      }
      throw error;
    }
  }
}
