import './helpers/test-env';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Company } from '../src/companies/companies.entity';
import { DriverVehicleAssignment } from '../src/drivers/driver-vehicle-assignment.entity';
import { Driver } from '../src/drivers/drivers.entity';
import { TypeOrmFleetUnitOfWork } from '../src/fleet/typeorm-fleet-unit-of-work';
import { TypeOrmVehicleAccess } from '../src/fleet/typeorm-vehicle-access';
import { TypeOrmDriverAllocation } from '../src/fleet/typeorm-driver-allocation';
import { Membership } from '../src/users/membership.entity';
import { MembershipRole } from '../src/users/membership-role';
import { User } from '../src/users/users.entity';
import { ManagerVehicleAssignment } from '../src/vehicles/manager-vehicle-assignment.entity';
import { Vehicle } from '../src/vehicles/vehicles.entity';

describe('TypeOrmFleetUnitOfWork (integration)', () => {
  let dataSource: DataSource;
  let fleet: TypeOrmFleetUnitOfWork;
  let vehicleAccess: TypeOrmVehicleAccess;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA,
      entities: [
        User,
        Company,
        Membership,
        Vehicle,
        ManagerVehicleAssignment,
        Driver,
        DriverVehicleAssignment,
      ],
      synchronize: false,
      extra: {
        options: `-c search_path=${process.env.DATABASE_SCHEMA},public`,
      },
    });
    await dataSource.initialize();
    vehicleAccess = new TypeOrmVehicleAccess(dataSource);
    fleet = new TypeOrmFleetUnitOfWork(
      dataSource,
      vehicleAccess,
      new TypeOrmDriverAllocation(dataSource),
    );
  });

  afterAll(async () => dataSource?.destroy());

  it('commits vehicle, access and allocation together', async () => {
    const seed = await seedFleet();

    const vehicleId = await createVehicle(seed);

    await expect(
      dataSource.getRepository(Vehicle).countBy({ id: vehicleId }),
    ).resolves.toBe(1);
    await expect(
      dataSource
        .getRepository(ManagerVehicleAssignment)
        .countBy({ vehicleId, managerId: seed.managerId }),
    ).resolves.toBe(1);
    await expect(
      dataSource
        .getRepository(DriverVehicleAssignment)
        .countBy({ vehicleId, driverId: seed.driverId }),
    ).resolves.toBe(1);
  });

  it('rolls every fleet store back when the transaction fails', async () => {
    const seed = await seedFleet();

    await expect(
      fleet.transact(async (stores) => {
        const vehicle = await stores.vehicles.create(
          vehicleInput(seed.companyId),
        );
        await stores.vehicleAccess.sync(seed.companyId, vehicle.id, [
          seed.managerId,
        ]);
        await stores.drivers.requireAll(seed.companyId, [seed.driverId]);
        await stores.driverAllocations.assignInitial(
          seed.companyId,
          vehicle.id,
          [seed.driverId],
        );
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    await expect(dataSource.getRepository(Vehicle).count()).resolves.toBe(0);
    await expect(
      dataSource.getRepository(ManagerVehicleAssignment).count(),
    ).resolves.toBe(0);
    await expect(
      dataSource.getRepository(DriverVehicleAssignment).count(),
    ).resolves.toBe(0);
  });

  it('closes manager access idempotently and retains history', async () => {
    const seed = await seedFleet();
    const vehicleId = await createVehicle(seed);

    await vehicleAccess.closeManager(seed.companyId, seed.managerId);
    const [closed] = await dataSource
      .getRepository(ManagerVehicleAssignment)
      .findBy({ vehicleId });
    await vehicleAccess.closeManager(seed.companyId, seed.managerId);
    const [stillClosed] = await dataSource
      .getRepository(ManagerVehicleAssignment)
      .findBy({ vehicleId });
    expect(stillClosed.assignedTo).toEqual(closed.assignedTo);

    await fleet.transact((stores) =>
      stores.vehicleAccess.sync(seed.companyId, vehicleId, [seed.managerId]),
    );
    await expect(
      dataSource.getRepository(ManagerVehicleAssignment).countBy({ vehicleId }),
    ).resolves.toBe(2);
  });

  it('allows many-to-many allocations, rejects an active pair, and restores closed pairs', async () => {
    const seed = await seedFleet();
    const firstVehicleId = await createVehicle(seed);
    const secondVehicleId = await fleet.transact(async (stores) => {
      const vehicle = await stores.vehicles.create({
        ...vehicleInput(seed.companyId),
        registrationNumber: 'WA5678',
      });
      await stores.driverAllocations.assign(
        seed.companyId,
        vehicle.id,
        seed.driverId,
      );
      return vehicle.id;
    });

    await expect(
      fleet.transact((stores) =>
        stores.driverAllocations.assign(
          seed.companyId,
          firstVehicleId,
          seed.driverId,
        ),
      ),
    ).rejects.toThrow(new ConflictException('Driver already assigned'));
    await fleet.transact(async (stores) => {
      await stores.driverAllocations.unassign(
        seed.companyId,
        firstVehicleId,
        seed.driverId,
      );
      await stores.driverAllocations.assign(
        seed.companyId,
        firstVehicleId,
        seed.driverId,
      );
    });

    const assignments = await dataSource
      .getRepository(DriverVehicleAssignment)
      .find({ order: { assignedFrom: 'ASC' } });
    expect(assignments).toHaveLength(3);
    expect(
      assignments.filter(({ assignedTo }) => assignedTo === null),
    ).toHaveLength(2);
    expect(assignments[0].assignedTo!.getTime()).toBeGreaterThanOrEqual(
      assignments[0].assignedFrom.getTime(),
    );
    expect(
      assignments.some(({ vehicleId }) => vehicleId === secondVehicleId),
    ).toBe(true);
  });

  async function seedFleet() {
    const company = await dataSource
      .getRepository(Company)
      .save({ name: 'Fleet workspace' });
    const manager = await dataSource.getRepository(User).save({
      email: `manager-${Date.now()}@example.com`,
    });
    await dataSource.getRepository(Membership).save({
      companyId: company.id,
      userId: manager.id,
      role: MembershipRole.MANAGER,
    });
    const driver = await dataSource.getRepository(Driver).save({
      companyId: company.id,
      firstName: 'Jan',
      lastName: 'Kowalski',
    });
    return {
      companyId: company.id,
      managerId: manager.id,
      driverId: driver.id,
    };
  }

  function createVehicle(seed: Awaited<ReturnType<typeof seedFleet>>) {
    return fleet.transact(async (stores) => {
      const vehicle = await stores.vehicles.create(
        vehicleInput(seed.companyId),
      );
      await stores.vehicleAccess.sync(seed.companyId, vehicle.id, [
        seed.managerId,
      ]);
      await stores.drivers.requireAll(seed.companyId, [seed.driverId]);
      await stores.driverAllocations.assignInitial(seed.companyId, vehicle.id, [
        seed.driverId,
      ]);
      return vehicle.id;
    });
  }

  function vehicleInput(companyId: string) {
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
