import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  FakeFleetUnitOfWork,
  type FleetMembership,
  type FleetVehicleInput,
} from '../fleet/fleet-unit-of-work';
import type { DriverAllocation } from '../fleet/driver-allocation';
import { MembershipRole } from '../users/membership-role';
import { Driver } from './drivers.entity';
import { DriversService } from './drivers.service';

interface FakeDriverAllocation {
  list: jest.Mock;
  find: jest.Mock;
  activeVehicles: jest.Mock;
}

const vehicleDefaults: Omit<
  FleetVehicleInput,
  'companyId' | 'brand' | 'model' | 'registrationNumber'
> = {
  productionYear: null,
  fuelType: null,
  vin: null,
  currentMileage: null,
  purchaseDate: null,
  ocExpiry: null,
  acExpiry: null,
  technicalInspectionExpiry: null,
  notes: null,
};

describe('DriversService', () => {
  const companyId = 'company-one';
  const adminId = 'admin-one';
  const managerId = 'manager-one';
  const userId = 'user-one';

  function setup(
    configure?: (mocks: { driverAllocation: FakeDriverAllocation }) => void,
  ) {
    const fleet = new FakeFleetUnitOfWork();
    fleet.memberships.push(
      membership(adminId, MembershipRole.ADMIN),
      membership(managerId, MembershipRole.MANAGER),
      membership(userId, MembershipRole.MANAGER),
    );
    const driverAllocation: FakeDriverAllocation = {
      list: jest.fn(),
      find: jest.fn(),
      activeVehicles: jest.fn().mockResolvedValue(new Map()),
    };
    configure?.({ driverAllocation });
    const service = new DriversService(
      fleet,
      driverAllocation as unknown as DriverAllocation,
    );
    return { fleet, service };
  }

  it('creates a driver without a linked user', async () => {
    const { fleet, service } = setup();

    const driver = await service.create(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      { firstName: 'Anna', lastName: 'Nowak' },
    );

    expect(driver).toBeInstanceOf(Driver);
    expect(driver).toMatchObject({
      firstName: 'Anna',
      lastName: 'Nowak',
      companyId,
      userId: null,
    });
    expect(fleet.drivers).toHaveLength(1);
  });

  it('rejects driver creation by an actor without an active membership', async () => {
    const { fleet, service } = setup();

    await expect(
      service.create(
        { id: 'stranger', companyId, role: MembershipRole.MANAGER },
        { firstName: 'Anna', lastName: 'Nowak' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fleet.drivers).toHaveLength(0);
  });

  it('rejects a manager linking a driver to a user account', async () => {
    const { fleet, service } = setup();

    await expect(
      service.create(
        { id: managerId, companyId, role: MembershipRole.MANAGER },
        { firstName: 'Anna', lastName: 'Nowak', userId },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fleet.drivers).toHaveLength(0);
  });

  it('lets an admin link a driver to an active member', async () => {
    const { fleet, service } = setup();

    const driver = await service.create(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      { firstName: 'Anna', lastName: 'Nowak', userId },
    );

    expect(driver.userId).toBe(userId);
    expect(fleet.drivers).toHaveLength(1);
  });

  it('rejects linking a driver to a user outside the membership', async () => {
    const { service } = setup();

    await expect(
      service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak', userId: 'no-such-user' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('list / findOne', () => {
    it('returns no drivers for an actor without a company', async () => {
      const { service } = setup();

      const drivers = await service.list({
        id: adminId,
        companyId: undefined,
        role: MembershipRole.ADMIN,
      } as never);

      expect(drivers).toEqual([]);
    });

    it('lists drivers with their active vehicles', async () => {
      const { service } = setup(({ driverAllocation }) => {
        driverAllocation.list.mockResolvedValue([
          { id: 'driver-1', companyId, firstName: 'Anna', lastName: 'Nowak' },
        ]);
        driverAllocation.activeVehicles.mockResolvedValue(
          new Map([['driver-1', [{ id: 'vehicle-1' }]]]),
        );
      });
      const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };

      const [driver] = await service.list(actor);

      expect(driver).toBeInstanceOf(Driver);
      expect(driver).toMatchObject({
        id: 'driver-1',
        activeVehicles: [{ id: 'vehicle-1' }],
      });
    });

    it('finds a single driver by id', async () => {
      const { service } = setup(({ driverAllocation }) => {
        driverAllocation.find.mockResolvedValue({
          id: 'driver-1',
          companyId,
          firstName: 'Anna',
          lastName: 'Nowak',
        });
      });
      const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };

      const driver = await service.findOne(actor, 'driver-1');

      expect(driver).toMatchObject({ id: 'driver-1', activeVehicles: [] });
    });
  });

  describe('update', () => {
    it('rejects an empty update body', async () => {
      const { service } = setup();

      await expect(
        service.update(
          { id: adminId, companyId, role: MembershipRole.ADMIN },
          'driver-1',
          {},
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a manager linking an existing driver to a user account', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );

      await expect(
        service.update(
          { id: managerId, companyId, role: MembershipRole.MANAGER },
          driver.id,
          { userId },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(fleet.drivers[0].userId).toBeNull();
    });

    it('rejects updating a driver assigned to a vehicle the manager cannot access', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );
      const vehicle = await createVehicle(fleet);
      await fleet.transact((stores) =>
        stores.driverAllocations.assign(companyId, vehicle.id, driver.id),
      );

      await expect(
        service.update(
          { id: managerId, companyId, role: MembershipRole.MANAGER },
          driver.id,
          { firstName: 'Blocked' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates driver fields', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );

      const updated = await service.update(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        driver.id,
        { firstName: 'Zofia' },
      );

      expect(updated).toBeInstanceOf(Driver);
      expect(updated.firstName).toBe('Zofia');
      expect(fleet.drivers[0].firstName).toBe('Zofia');
    });
  });

  describe('remove', () => {
    it('rejects removal by a non-admin', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );

      await expect(
        service.remove(
          { id: managerId, companyId, role: MembershipRole.MANAGER },
          driver.id,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(fleet.drivers[0].deletedAt).toBeNull();
    });

    it('soft-deletes the driver and closes their open assignments', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );
      const vehicle = await createVehicle(fleet);
      await fleet.transact((stores) =>
        stores.driverAllocations.assign(companyId, vehicle.id, driver.id),
      );

      await service.remove(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        driver.id,
      );

      expect(fleet.drivers[0].deletedAt).not.toBeNull();
      expect(fleet.driverAssignments[0].assignedTo).not.toBeNull();
    });
  });

  describe('assign / unassign', () => {
    it('assigns a driver to a vehicle idempotently', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );
      const vehicle = await createVehicle(fleet);
      const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };

      const assignment = await service.assign(actor, vehicle.id, {
        driverId: driver.id,
      });
      await service.assign(actor, vehicle.id, { driverId: driver.id });

      expect(fleet.driverAssignments).toHaveLength(1);
      expect(assignment.driverId).toBe(driver.id);
    });

    it('rejects assigning an unknown driver', async () => {
      const { fleet, service } = setup();
      const vehicle = await createVehicle(fleet);

      await expect(
        service.assign(
          { id: adminId, companyId, role: MembershipRole.ADMIN },
          vehicle.id,
          { driverId: 'no-such-driver' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('unassigns an active driver', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );
      const vehicle = await createVehicle(fleet);
      const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };
      await service.assign(actor, vehicle.id, { driverId: driver.id });

      await service.unassign(actor, vehicle.id, driver.id);

      expect(fleet.driverAssignments[0].assignedTo).not.toBeNull();
    });
  });

  describe('assignmentHistory', () => {
    it('returns the assignment history for a vehicle', async () => {
      const { fleet, service } = setup();
      const driver = await service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        { firstName: 'Anna', lastName: 'Nowak' },
      );
      const vehicle = await createVehicle(fleet);
      const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };
      await service.assign(actor, vehicle.id, { driverId: driver.id });

      const history = await service.assignmentHistory(actor, vehicle.id);

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        vehicleId: vehicle.id,
        driverId: driver.id,
      });
    });
  });

  function createVehicle(fleet: FakeFleetUnitOfWork) {
    return fleet.transact((stores) =>
      stores.vehicles.create({
        companyId,
        brand: 'Ford',
        model: 'Transit',
        registrationNumber: `WA-${fleet.vehicles.length + 1}`,
        ...vehicleDefaults,
      }),
    );
  }

  function membership(id: string, role: MembershipRole): FleetMembership {
    return { userId: id, companyId, role, status: 'active' };
  }
});
