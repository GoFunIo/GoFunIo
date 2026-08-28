import './helpers/test-env';
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
import { WorkspaceCalendar } from '../src/common/workspace-calendar';
import { VehicleDeadlineNotificationWriter } from '../src/notifications/vehicle-deadline-notification-writer';
import { VehicleDeadlineRecipientReconciler } from '../src/notifications/vehicle-deadline-recipient-reconciler';
import { EventEmitter2 } from '@nestjs/event-emitter';

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
    const clock = { now: () => new Date() };
    const calendar = new WorkspaceCalendar(clock);
    const deadlineRecipients = new VehicleDeadlineRecipientReconciler(
      calendar,
      clock,
      vehicleAccess,
    );
    fleet = new TypeOrmFleetUnitOfWork(
      dataSource,
      vehicleAccess,
      new TypeOrmDriverAllocation(dataSource),
      new VehicleDeadlineNotificationWriter(
        calendar,
        clock,
        deadlineRecipients,
      ),
      deadlineRecipients,
      new EventEmitter2(),
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
        await stores.vehicleAccess.assign(
          seed.companyId,
          vehicle.id,
          seed.managerId,
        );
        await stores.drivers.requireOne(seed.companyId, seed.driverId);
        await stores.driverAllocations.assign(
          seed.companyId,
          vehicle.id,
          seed.driverId,
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

    await dataSource.transaction((manager) =>
      vehicleAccess.closeManager(manager, seed.companyId, seed.managerId),
    );
    const [closed] = await dataSource
      .getRepository(ManagerVehicleAssignment)
      .findBy({ vehicleId });
    await dataSource.transaction((manager) =>
      vehicleAccess.closeManager(manager, seed.companyId, seed.managerId),
    );
    const [stillClosed] = await dataSource
      .getRepository(ManagerVehicleAssignment)
      .findBy({ vehicleId });
    expect(stillClosed.assignedTo).toEqual(closed.assignedTo);

    await fleet.transact((stores) =>
      stores.vehicleAccess.assign(seed.companyId, vehicleId, seed.managerId),
    );
    await expect(
      dataSource.getRepository(ManagerVehicleAssignment).countBy({ vehicleId }),
    ).resolves.toBe(2);
  });

  it('keeps multiple active drivers per vehicle', async () => {
    const seed = await seedFleet();
    const firstVehicleId = await createVehicle(seed);
    const secondDriver = await dataSource.getRepository(Driver).save({
      companyId: seed.companyId,
      firstName: 'Anna',
      lastName: 'Nowak',
    });
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

    await fleet.transact((stores) =>
      stores.driverAllocations.assign(
        seed.companyId,
        firstVehicleId,
        seed.driverId,
      ),
    );
    await fleet.transact((stores) =>
      stores.driverAllocations.assign(
        seed.companyId,
        firstVehicleId,
        secondDriver.id,
      ),
    );

    const assignments = await dataSource
      .getRepository(DriverVehicleAssignment)
      .find({ order: { assignedFrom: 'ASC' } });
    expect(assignments).toHaveLength(3);
    expect(
      assignments.filter(({ assignedTo }) => assignedTo === null),
    ).toHaveLength(3);
    expect(assignments.every(({ assignedTo }) => assignedTo === null)).toBe(
      true,
    );
    expect(
      assignments.some(({ vehicleId }) => vehicleId === secondVehicleId),
    ).toBe(true);
    expect(
      assignments
        .filter(
          ({ vehicleId, assignedTo }) =>
            vehicleId === firstVehicleId && assignedTo === null,
        )
        .map(({ driverId }) => driverId),
    ).toEqual(expect.arrayContaining([seed.driverId, secondDriver.id]));
  });

  it('keeps concurrent assignments of different drivers', async () => {
    const seed = await seedFleet();
    const vehicleId = await createVehicle(seed);
    const drivers = await dataSource.getRepository(Driver).save([
      {
        companyId: seed.companyId,
        firstName: 'First',
        lastName: 'Replacement',
      },
      {
        companyId: seed.companyId,
        firstName: 'Second',
        lastName: 'Replacement',
      },
    ]);

    await Promise.all(
      drivers.map((driver) =>
        fleet.transact((stores) =>
          stores.driverAllocations.assign(seed.companyId, vehicleId, driver.id),
        ),
      ),
    );

    const assignments = await dataSource
      .getRepository(DriverVehicleAssignment)
      .findBy({ vehicleId });
    expect(assignments).toHaveLength(3);
    expect(
      assignments.filter(({ assignedTo }) => assignedTo === null),
    ).toHaveLength(3);
    expect(assignments.map(({ driverId }) => driverId)).toEqual(
      expect.arrayContaining([seed.driverId, ...drivers.map(({ id }) => id)]),
    );
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
      await stores.vehicleAccess.assign(
        seed.companyId,
        vehicle.id,
        seed.managerId,
      );
      await stores.drivers.requireOne(seed.companyId, seed.driverId);
      await stores.driverAllocations.assign(
        seed.companyId,
        vehicle.id,
        seed.driverId,
      );
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
