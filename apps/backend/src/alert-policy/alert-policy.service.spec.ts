import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import type { Clock } from '../common/clock';
import type { NotificationChangeRelay } from '../notification-changes/notification-change-relay';
import type { SessionPrincipal } from '../users/session-principal';
import { Membership } from '../users/membership.entity';
import { MembershipRole } from '../users/membership-role';
import { AlertPolicyService } from './alert-policy.service';
import { UpdateVehicleDeadlineAlertPolicyDto } from './dtos/update-vehicle-deadline-alert-policy.dto';
import {
  VehicleDeadlineAlertPolicy,
  VehicleDeadlineKind,
} from './vehicle-deadline-alert-policy.entity';

const companyId = 'company-1';
const actor: SessionPrincipal = {
  id: 'actor-1',
  companyId,
  role: MembershipRole.ADMIN,
};
const now = new Date('2024-01-01T00:00:00Z');

function setup(options: {
  membership?: Membership | null;
  policy?: VehicleDeadlineAlertPolicy | null;
}) {
  const manager = {
    findOne: jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(options.membership ?? null))
      .mockImplementationOnce(() => Promise.resolve(options.policy ?? null)),
    save: jest.fn((entity: VehicleDeadlineAlertPolicy) => Promise.resolve(entity)),
  };
  const policies = {
    findOneBy: jest.fn(() => Promise.resolve(options.policy ?? null)),
    manager: {
      transaction: jest.fn(
        async (callback: (value: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    },
  };
  const clock: Clock = { now: () => now };
  const notificationChanges = { record: jest.fn().mockResolvedValue('id') };
  const service = new AlertPolicyService(
    policies as unknown as Repository<VehicleDeadlineAlertPolicy>,
    clock,
    notificationChanges as unknown as NotificationChangeRelay,
  );
  return { service, manager, notificationChanges };
}

describe('AlertPolicyService get', () => {
  it('returns the workspace policy', async () => {
    const policy = { companyId } as VehicleDeadlineAlertPolicy;
    const { service } = setup({ policy });

    await expect(service.get(actor)).resolves.toBe(policy);
  });

  it('throws when no policy exists for the workspace', async () => {
    const { service } = setup({ policy: null });

    await expect(service.get(actor)).rejects.toThrow(NotFoundException);
  });
});

describe('AlertPolicyService update', () => {
  it('rejects an empty update', () => {
    const { service } = setup({});

    expect(() =>
      service.update(actor, new UpdateVehicleDeadlineAlertPolicyDto()),
    ).toThrow(BadRequestException);
  });

  it('rejects an actor without an active workspace', () => {
    const { service } = setup({});

    expect(() =>
      service.update(
        { ...actor, companyId: null },
        Object.assign(new UpdateVehicleDeadlineAlertPolicyDto(), {
          timeZone: 'Europe/Warsaw',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects when the actor has no active membership', async () => {
    const { service } = setup({ membership: null });

    await expect(
      service.update(
        actor,
        Object.assign(new UpdateVehicleDeadlineAlertPolicyDto(), {
          timeZone: 'Europe/Warsaw',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a non-admin actor', async () => {
    const { service } = setup({
      membership: { role: MembershipRole.MANAGER } as Membership,
    });

    await expect(
      service.update(
        actor,
        Object.assign(new UpdateVehicleDeadlineAlertPolicyDto(), {
          timeZone: 'Europe/Warsaw',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects when no policy exists for the workspace', async () => {
    const { service } = setup({
      membership: { role: MembershipRole.ADMIN } as Membership,
      policy: null,
    });

    await expect(
      service.update(
        actor,
        Object.assign(new UpdateVehicleDeadlineAlertPolicyDto(), {
          timeZone: 'Europe/Warsaw',
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('applies every provided field and records the change', async () => {
    const policy = {
      companyId,
      enabledDeadlineKinds: [VehicleDeadlineKind.OC],
      leadDays: [30],
      timeZone: 'Europe/Warsaw',
      activatedAt: new Date('2023-01-01T00:00:00Z'),
    } as VehicleDeadlineAlertPolicy;
    const { service, manager, notificationChanges } = setup({
      membership: { role: MembershipRole.ADMIN } as Membership,
      policy,
    });

    const result = await service.update(
      actor,
      Object.assign(new UpdateVehicleDeadlineAlertPolicyDto(), {
        enabledDeadlineKinds: [VehicleDeadlineKind.AC, VehicleDeadlineKind.OC],
        leadDays: [7, 30, 14],
        timeZone: 'Europe/Berlin',
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        enabledDeadlineKinds: [VehicleDeadlineKind.AC, VehicleDeadlineKind.OC],
        leadDays: [30, 14, 7],
        timeZone: 'Europe/Berlin',
        activatedAt: now,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(policy);
    expect(notificationChanges.record).toHaveBeenCalledWith(manager, {
      companyId,
      userId: null,
    });
  });

  it('leaves fields untouched when they are not provided', async () => {
    const policy = {
      companyId,
      enabledDeadlineKinds: [VehicleDeadlineKind.OC],
      leadDays: [30],
      timeZone: 'Europe/Warsaw',
      activatedAt: new Date('2023-01-01T00:00:00Z'),
    } as VehicleDeadlineAlertPolicy;
    const { service } = setup({
      membership: { role: MembershipRole.OWNER } as Membership,
      policy,
    });

    const result = await service.update(
      actor,
      Object.assign(new UpdateVehicleDeadlineAlertPolicyDto(), {
        timeZone: 'Europe/Berlin',
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        enabledDeadlineKinds: [VehicleDeadlineKind.OC],
        leadDays: [30],
        timeZone: 'Europe/Berlin',
      }),
    );
  });

  it('leaves timeZone untouched when not provided', async () => {
    const policy = {
      companyId,
      enabledDeadlineKinds: [VehicleDeadlineKind.OC],
      leadDays: [30],
      timeZone: 'Europe/Warsaw',
      activatedAt: new Date('2023-01-01T00:00:00Z'),
    } as VehicleDeadlineAlertPolicy;
    const { service } = setup({
      membership: { role: MembershipRole.ADMIN } as Membership,
      policy,
    });

    const result = await service.update(
      actor,
      Object.assign(new UpdateVehicleDeadlineAlertPolicyDto(), {
        leadDays: [14],
      }),
    );

    expect(result.timeZone).toBe('Europe/Warsaw');
  });
});
