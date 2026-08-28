import { ForbiddenException } from '@nestjs/common';
import {
  FakeFleetUnitOfWork,
  type FleetMembership,
} from '../fleet/fleet-unit-of-work';
import type { VehicleAccess } from '../fleet/vehicle-access';
import type { DriverAllocation } from '../fleet/driver-allocation';
import { MembershipRole } from '../users/membership-role';
import { Vehicle } from './vehicles.entity';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService create workflow', () => {
  const companyId = 'company-one';
  const adminId = 'admin-one';
  const managerId = 'manager-one';
  const driverId = 'driver-one';

  function setup() {
    const fleet = new FakeFleetUnitOfWork();
    fleet.memberships.push(
      membership(adminId, MembershipRole.ADMIN),
      membership(managerId, MembershipRole.MANAGER),
    );
    fleet.managerProfiles.push({
      id: managerId,
      firstName: 'Jan',
      lastName: null,
      email: 'manager@example.com',
    });
    fleet.drivers.push({
      id: driverId,
      companyId,
      firstName: 'Anna',
      lastName: 'Nowak',
    });
    const vehicleAccess = {
      list: jest.fn(),
      activeManagers: jest.fn((_companyId, vehicleIds: string[]) =>
        Promise.resolve(
          new Map(
            vehicleIds.map((vehicleId) => [
              vehicleId,
              fleet.managerAssignments
                .filter(
                  (assignment) =>
                    assignment.vehicleId === vehicleId &&
                    assignment.assignedTo === null,
                )
                .map(({ managerId }) => ({
                  id: managerId,
                  firstName: 'Jan',
                  lastName: null,
                  email: 'manager@example.com',
                })),
            ]),
          ),
        ),
      ),
    };
    const driverAllocation = {
      activeDrivers: jest.fn((_companyId, vehicleIds: string[]) =>
        Promise.resolve(
          new Map(
            vehicleIds.map((vehicleId) => [
              vehicleId,
              fleet.driverAssignments.some(
                (assignment) =>
                  assignment.vehicleId === vehicleId &&
                  assignment.assignedTo === null,
              )
                ? [{ id: driverId, firstName: 'Anna', lastName: 'Nowak' }]
                : [],
            ]),
          ),
        ),
      ),
    };
    const service = new VehiclesService(
      fleet,
      vehicleAccess as unknown as VehicleAccess,
      driverAllocation as unknown as DriverAllocation,
    );
    return { driverAllocation, fleet, service, vehicleAccess };
  }

  it('creates a vehicle without access or allocation', async () => {
    const { fleet, service } = setup();

    const vehicle = await service.create(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      {
        brand: 'Ford',
        model: 'Transit',
        registrationNumber: 'WA1234',
      },
    );

    expect(vehicle).toMatchObject({
      brand: 'Ford',
      managers: [],
      drivers: [],
    });
    expect(vehicle).not.toBeInstanceOf(Vehicle);
    expect(fleet.vehicles).toHaveLength(1);
    expect(fleet.managerAssignments).toEqual([]);
    expect(fleet.driverAssignments).toEqual([]);
  });

  it('composes a non-empty page with one batched read per assignment seam', async () => {
    const { driverAllocation, fleet, service, vehicleAccess } = setup();
    const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };
    await service.create(actor, {
      brand: 'Ford',
      model: 'Transit',
      registrationNumber: 'WA1234',
    });
    await service.create(actor, {
      brand: 'Ford',
      model: 'Focus',
      registrationNumber: 'WA5678',
    });
    await fleet.transact(async (stores) => {
      await stores.vehicleAccess.assign(
        companyId,
        fleet.vehicles[0].id,
        managerId,
      );
      await stores.driverAllocations.assign(
        companyId,
        fleet.vehicles[0].id,
        driverId,
      );
    });
    vehicleAccess.activeManagers.mockClear();
    driverAllocation.activeDrivers.mockClear();
    vehicleAccess.list.mockResolvedValue({
      items: fleet.vehicles,
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });

    const page = await service.list(actor, {} as never);
    const vehicleIds = fleet.vehicles.map(({ id }) => id);

    expect(page.items).toEqual([
      expect.objectContaining({
        managers: [
          {
            id: managerId,
            firstName: 'Jan',
            lastName: null,
            email: 'manager@example.com',
          },
        ],
        drivers: [{ id: driverId, firstName: 'Anna', lastName: 'Nowak' }],
      }),
      expect.objectContaining({ managers: [], drivers: [] }),
    ]);
    expect(page.items[0]).not.toHaveProperty('managerIds');
    expect(page.items[0]).not.toHaveProperty('driverIds');
    expect(page.items[0]).not.toHaveProperty('driver');
    expect(vehicleAccess.activeManagers).toHaveBeenCalledTimes(1);
    expect(vehicleAccess.activeManagers).toHaveBeenCalledWith(
      companyId,
      vehicleIds,
    );
    expect(driverAllocation.activeDrivers).toHaveBeenCalledTimes(1);
    expect(driverAllocation.activeDrivers).toHaveBeenCalledWith(
      companyId,
      vehicleIds,
    );
  });

  it('rejects vehicle creation by a manager before writing', async () => {
    const { fleet, service } = setup();

    await expect(
      service.create(
        { id: managerId, companyId, role: MembershipRole.MANAGER },
        { brand: 'Ford', model: 'Transit', registrationNumber: 'WA1234' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fleet.vehicles).toHaveLength(0);
  });

  it('assigns idempotently and unassigns one manager', async () => {
    const { fleet, service } = setup();
    const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };
    const vehicle = await service.create(actor, {
      brand: 'Ford',
      model: 'Transit',
      registrationNumber: 'WA1234',
    });

    const assignment = await service.assignManager(actor, vehicle.id, {
      managerId,
    });
    await service.assignManager(actor, vehicle.id, { managerId });
    expect(fleet.managerAssignments).toHaveLength(1);

    await service.unassignManager(actor, vehicle.id, managerId);
    expect(assignment.assignedTo).not.toBeNull();
  });

  function membership(userId: string, role: MembershipRole): FleetMembership {
    return { userId, companyId, role, status: 'active' };
  }
});
