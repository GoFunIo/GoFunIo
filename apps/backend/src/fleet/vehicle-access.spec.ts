import { NotFoundException } from '@nestjs/common';
import { MembershipRole } from '../users/membership-role';
import { FakeFleetUnitOfWork } from './fleet-unit-of-work';

describe('VehicleAccess policy', () => {
  const companyId = 'company-one';
  const adminId = 'admin-one';
  const assignedManagerId = 'manager-one';
  const otherManagerId = 'manager-two';

  function setup() {
    const fleet = new FakeFleetUnitOfWork();
    fleet.memberships.push(
      membership(adminId, MembershipRole.ADMIN),
      membership(assignedManagerId, MembershipRole.MANAGER),
      membership(otherManagerId, MembershipRole.MANAGER),
    );
    return fleet;
  }

  it('gives admins every vehicle and managers only active assignments', async () => {
    const fleet = setup();

    await fleet.transact(async (stores) => {
      const vehicle = await stores.vehicles.create(vehicleInput());
      await stores.vehicleAccess.assign(
        companyId,
        vehicle.id,
        assignedManagerId,
      );

      await expect(
        stores.vehicleAccess.find(
          principal(adminId, MembershipRole.ADMIN),
          vehicle.id,
        ),
      ).resolves.toBe(vehicle);
      await expect(
        stores.vehicleAccess.find(
          principal(assignedManagerId, MembershipRole.MANAGER),
          vehicle.id,
        ),
      ).resolves.toBe(vehicle);
      await expect(
        stores.vehicleAccess.find(
          principal(otherManagerId, MembershipRole.MANAGER),
          vehicle.id,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('assigns once and closes access idempotently with vehicle cleanup', async () => {
    const fleet = setup();

    await fleet.transact(async (stores) => {
      const vehicle = await stores.vehicles.create(vehicleInput());
      await stores.vehicleAccess.assign(
        companyId,
        vehicle.id,
        assignedManagerId,
      );
      await stores.vehicleAccess.assign(
        companyId,
        vehicle.id,
        assignedManagerId,
      );
      expect(fleet.managerAssignments).toHaveLength(1);

      await stores.vehicleAccess.closeVehicle(companyId, vehicle.id);
      const closedAt = fleet.managerAssignments[0].assignedTo;
      await stores.vehicleAccess.closeVehicle(companyId, vehicle.id);
      expect(fleet.managerAssignments[0].assignedTo).toBe(closedAt);
      await expect(
        stores.vehicleAccess.activeManagerIds(companyId, [vehicle.id]),
      ).resolves.toEqual(new Map([[vehicle.id, []]]));
    });
  });

  function membership(userId: string, role: MembershipRole) {
    return { userId, companyId, role, status: 'active' };
  }

  function principal(id: string, role: MembershipRole) {
    return { id, companyId, role };
  }

  function vehicleInput() {
    return {
      companyId,
      brand: 'Ford',
      model: 'Transit',
      registrationNumber: 'WA1234',
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
  }
});
