import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  FakeFleetUnitOfWork,
  type FleetMembership,
} from '../fleet/fleet-unit-of-work';
import { Driver } from '../drivers/drivers.entity';
import type { VehicleAccess } from '../fleet/vehicle-access';
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
    const service = new VehiclesService(
      {} as Repository<Vehicle>,
      fleet,
      {} as VehicleAccess,
    );
    return { fleet, service };
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
    expect(fleet.vehicles).toHaveLength(1);
    expect(fleet.managerAssignments).toEqual([
      expect.objectContaining({ companyId, vehicleId: vehicle.id, managerId }),
    ]);
    expect(fleet.driverAssignments).toEqual([
      expect.objectContaining({ companyId, vehicleId: vehicle.id, driverId }),
    ]);
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
