import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
    fleet.drivers.push({ id: driverId, companyId });
    const vehicleAccess = {
      list: jest.fn(),
      activeManagerIds: jest.fn(
        async (_companyId, vehicleIds: string[]) =>
          new Map(
            vehicleIds.map((vehicleId) => [
              vehicleId,
              fleet.managerAssignments
                .filter(
                  (assignment) =>
                    assignment.vehicleId === vehicleId &&
                    assignment.assignedTo === null,
                )
                .map(({ managerId }) => managerId),
            ]),
          ),
      ),
    };
    const driverAllocation = {
      activeDriverIds: jest.fn(
        async (_companyId, vehicleIds: string[]) =>
          new Map(
            vehicleIds.map((vehicleId) => [
              vehicleId,
              fleet.driverAssignments
                .filter(
                  (assignment) =>
                    assignment.vehicleId === vehicleId &&
                    assignment.assignedTo === null,
                )
                .map(({ driverId }) => driverId),
            ]),
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

  it('creates a vehicle with its initial access and allocation atomically', async () => {
    const { fleet, service } = setup();

    const vehicle = await service.create(
      { id: adminId, companyId, role: MembershipRole.ADMIN },
      {
        brand: 'Ford',
        model: 'Transit',
        registrationNumber: 'WA1234',
        managerIds: [managerId],
        driverIds: [driverId],
      },
    );

    expect(vehicle).toMatchObject({
      brand: 'Ford',
      managerIds: [managerId],
      driverIds: [driverId],
    });
    expect(vehicle).not.toBeInstanceOf(Vehicle);
    expect(fleet.vehicles).toHaveLength(1);
    expect(fleet.managerAssignments).toEqual([
      expect.objectContaining({ companyId, vehicleId: vehicle.id, managerId }),
    ]);
    expect(fleet.driverAssignments).toEqual([
      expect.objectContaining({ companyId, vehicleId: vehicle.id, driverId }),
    ]);
  });

  it('composes a non-empty page with one batched read per assignment seam', async () => {
    const { driverAllocation, fleet, service, vehicleAccess } = setup();
    const actor = { id: adminId, companyId, role: MembershipRole.ADMIN };
    await service.create(actor, {
      brand: 'Ford',
      model: 'Transit',
      registrationNumber: 'WA1234',
      managerIds: [managerId],
      driverIds: [driverId],
    });
    await service.create(actor, {
      brand: 'Ford',
      model: 'Focus',
      registrationNumber: 'WA5678',
    });
    vehicleAccess.activeManagerIds.mockClear();
    driverAllocation.activeDriverIds.mockClear();
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
        managerIds: [managerId],
        driverIds: [driverId],
      }),
      expect.objectContaining({ managerIds: [], driverIds: [] }),
    ]);
    expect(vehicleAccess.activeManagerIds).toHaveBeenCalledTimes(1);
    expect(vehicleAccess.activeManagerIds).toHaveBeenCalledWith(
      companyId,
      vehicleIds,
    );
    expect(driverAllocation.activeDriverIds).toHaveBeenCalledTimes(1);
    expect(driverAllocation.activeDriverIds).toHaveBeenCalledWith(
      companyId,
      vehicleIds,
    );
  });

  it('automatically gives a creating manager access', async () => {
    const { fleet, service } = setup();

    const vehicle = await service.create(
      { id: managerId, companyId, role: MembershipRole.MANAGER },
      { brand: 'Ford', model: 'Transit', registrationNumber: 'WA1234' },
    );

    expect(vehicle.managerIds).toEqual([managerId]);
    expect(fleet.managerAssignments).toEqual([
      expect.objectContaining({ companyId, vehicleId: vehicle.id, managerId }),
    ]);
  });

  it('rejects managerIds supplied by a manager before writing', async () => {
    const { fleet, service } = setup();

    await expect(
      service.create(
        { id: managerId, companyId, role: MembershipRole.MANAGER },
        {
          brand: 'Ford',
          model: 'Transit',
          registrationNumber: 'WA1234',
          managerIds: [],
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fleet.vehicles).toHaveLength(0);
  });

  it('rolls back earlier writes when a driver belongs to another workspace', async () => {
    const { fleet, service } = setup();
    fleet.drivers[0].companyId = 'company-two';

    await expect(
      service.create(
        { id: adminId, companyId, role: MembershipRole.ADMIN },
        {
          brand: 'Ford',
          model: 'Transit',
          registrationNumber: 'WA1234',
          managerIds: [managerId],
          driverIds: [driverId],
        },
      ),
    ).rejects.toThrow(new BadRequestException('Invalid driver'));
    expect(fleet.vehicles).toHaveLength(0);
    expect(fleet.managerAssignments).toHaveLength(0);
    expect(fleet.driverAssignments).toHaveLength(0);
  });

  function membership(userId: string, role: MembershipRole): FleetMembership {
    return { userId, companyId, role, status: 'active' };
  }
});
