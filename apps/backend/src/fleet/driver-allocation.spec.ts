import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '../users/membership-role';
import { FakeFleetUnitOfWork } from './fleet-unit-of-work';

describe('DriverAllocation lifecycle', () => {
  const companyId = 'company-one';
  const driverId = 'driver-one';

  it('keeps one active driver per vehicle and retains replacement history', async () => {
    const fleet = setup();

    await fleet.transact(async ({ driverAllocations }) => {
      const first = await driverAllocations.assign(
        companyId,
        'vehicle-one',
        driverId,
      );
      await driverAllocations.assign(companyId, 'vehicle-two', driverId);
      await expect(
        driverAllocations.assign(companyId, 'vehicle-one', driverId),
      ).resolves.toMatchObject({ id: first.id });
      await driverAllocations.assign(companyId, 'vehicle-one', 'driver-two');
    });

    expect(fleet.driverAssignments).toHaveLength(3);
    expect(
      fleet.driverAssignments.filter(({ assignedTo }) => assignedTo === null),
    ).toHaveLength(2);
    expect(
      fleet.driverAssignments.find(
        ({ vehicleId, assignedTo }) =>
          vehicleId === 'vehicle-one' && assignedTo === null,
      )?.driverId,
    ).toBe('driver-two');
  });

  it('rejects multiple initial drivers', async () => {
    const fleet = setup();

    await expect(
      fleet.transact(({ driverAllocations }) =>
        driverAllocations.assignInitial(companyId, 'vehicle-one', [
          driverId,
          'driver-two',
        ]),
      ),
    ).rejects.toThrow(
      new BadRequestException('Only one active driver allowed'),
    );
  });

  it('lets each manager edit a shared driver and rolls cleanup back on failure', async () => {
    const fleet = setup();
    fleet.memberships.push(
      membership('manager-one', MembershipRole.MANAGER),
      membership('manager-two', MembershipRole.MANAGER),
    );
    fleet.managerAssignments.push(
      access('manager-one', 'vehicle-one'),
      access('manager-two', 'vehicle-two'),
    );

    await fleet.transact(async ({ driverAllocations }) => {
      await driverAllocations.assign(companyId, 'vehicle-one', driverId);
      await driverAllocations.assign(companyId, 'vehicle-two', driverId);
      await expect(
        driverAllocations.find(
          principal('manager-one', MembershipRole.MANAGER),
          driverId,
        ),
      ).resolves.toMatchObject({ id: driverId });
      await expect(
        driverAllocations.find(
          principal('manager-two', MembershipRole.MANAGER),
          driverId,
        ),
      ).resolves.toMatchObject({ id: driverId });
    });

    await expect(
      fleet.transact(async ({ driverAllocations, drivers }) => {
        await driverAllocations.closeDriver(companyId, driverId);
        await drivers.softDelete(driverId);
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    expect(fleet.drivers[0].deletedAt).toBeNull();
    expect(
      fleet.driverAssignments.every(({ assignedTo }) => assignedTo === null),
    ).toBe(true);
  });

  it('hides allocated drivers from managers without vehicle access', async () => {
    const fleet = setup();
    fleet.memberships.push(membership('manager', MembershipRole.MANAGER));
    await fleet.transact(({ driverAllocations }) =>
      driverAllocations.assign(companyId, 'vehicle', driverId),
    );

    await expect(
      fleet.transact(({ driverAllocations }) =>
        driverAllocations.find(
          principal('manager', MembershipRole.MANAGER),
          driverId,
        ),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function setup() {
    const fleet = new FakeFleetUnitOfWork();
    fleet.drivers.push({ id: driverId, companyId, deletedAt: null });
    return fleet;
  }

  function membership(userId: string, role: MembershipRole) {
    return { userId, companyId, role, status: 'active' };
  }

  function principal(id: string, role: MembershipRole) {
    return { id, companyId, role };
  }

  function access(managerId: string, vehicleId: string) {
    const now = new Date();
    return {
      id: `${managerId}-${vehicleId}`,
      companyId,
      managerId,
      vehicleId,
      assignedFrom: now,
      assignedTo: null,
      createdAt: now,
    };
  }
});
