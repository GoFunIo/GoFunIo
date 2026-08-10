import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  isWorkspaceAdmin,
  type MembershipRole,
} from '../users/membership-role';
import type { SessionPrincipal } from '../users/session-principal';
import type { VehicleFuelType } from '../vehicles/vehicles.entity';
import type { FleetManagerAssignment } from './vehicle-access';
import type { DriverAllocationStore } from './driver-allocation';

export const FLEET_UNIT_OF_WORK = Symbol('FLEET_UNIT_OF_WORK');

export interface FleetVehicleInput {
  companyId: string;
  brand: string;
  model: string;
  productionYear: number | null;
  fuelType: VehicleFuelType | null;
  vin: string | null;
  registrationNumber: string;
  currentMileage: number | null;
  purchaseDate: string | null;
  ocExpiry: string | null;
  acExpiry: string | null;
  technicalInspectionExpiry: string | null;
  notes: string | null;
}

export interface FleetVehicle extends FleetVehicleInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FleetMembership {
  userId: string;
  companyId: string;
  role: MembershipRole;
  status: string;
}

export interface FleetDriver {
  id: string;
  companyId: string;
  userId?: string | null;
  deletedAt?: Date | null;
}

export interface FleetDriverInput {
  companyId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface FleetDriverAssignment {
  id: string;
  companyId: string;
  driverId: string;
  vehicleId: string;
  assignedFrom: Date;
  assignedTo: Date | null;
  createdAt: Date;
}

export interface FleetVehicleAccessStore {
  requireActor(
    companyId: string,
    userId: string,
    role: MembershipRole,
  ): Promise<void>;
  find(
    actor: SessionPrincipal,
    vehicleId: string,
    lock?: boolean,
  ): Promise<FleetVehicle>;
  findForHistory(
    actor: SessionPrincipal,
    vehicleId: string,
  ): Promise<FleetVehicle>;
  sync(
    companyId: string,
    vehicleId: string,
    managerIds: string[],
  ): Promise<void>;
  activeManagerIds(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, string[]>>;
  closeVehicle(companyId: string, vehicleId: string): Promise<void>;
}

export interface FleetTransaction {
  vehicles: {
    create(input: FleetVehicleInput): Promise<FleetVehicle>;
    update(
      vehicleId: string,
      fields: Partial<Omit<FleetVehicleInput, 'companyId'>>,
    ): Promise<FleetVehicle>;
    softDelete(vehicleId: string): Promise<void>;
  };
  vehicleAccess: FleetVehicleAccessStore;
  drivers: {
    create(input: FleetDriverInput): Promise<FleetDriver>;
    update(
      driverId: string,
      fields: Partial<Omit<FleetDriverInput, 'companyId'>>,
    ): Promise<FleetDriver>;
    softDelete(driverId: string): Promise<void>;
    requireAll(companyId: string, driverIds: string[]): Promise<void>;
    requireOne(companyId: string, driverId: string): Promise<void>;
  };
  driverAllocations: DriverAllocationStore;
}

export interface FleetUnitOfWork {
  transact<T>(work: (fleet: FleetTransaction) => Promise<T>): Promise<T>;
}

export class FakeFleetUnitOfWork implements FleetUnitOfWork {
  readonly memberships: FleetMembership[] = [];
  readonly drivers: FleetDriver[] = [];
  readonly vehicles: FleetVehicle[] = [];
  readonly managerAssignments: FleetManagerAssignment[] = [];
  readonly driverAssignments: FleetDriverAssignment[] = [];
  private pendingTransaction: Promise<void> = Promise.resolve();

  transact<T>(work: (fleet: FleetTransaction) => Promise<T>): Promise<T> {
    const result = this.pendingTransaction.then(() => this.run(work));
    this.pendingTransaction = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private requireMembershipLink(
    companyId: string,
    userId: string | null,
    excludeDriverId?: string,
  ): void {
    if (!userId) return;
    const member = this.memberships.some(
      (membership) =>
        membership.userId === userId && membership.companyId === companyId,
    );
    if (!member) throw new BadRequestException('Invalid membership');
    const linked = this.drivers.some(
      (driver) =>
        driver.id !== excludeDriverId &&
        driver.companyId === companyId &&
        driver.userId === userId &&
        !driver.deletedAt,
    );
    if (linked) throw new ConflictException('Membership already linked');
  }

  private async run<T>(
    work: (fleet: FleetTransaction) => Promise<T>,
  ): Promise<T> {
    const vehicles = this.vehicles.map((vehicle) => ({ ...vehicle }));
    const drivers = this.drivers.map((driver) => ({ ...driver }));
    const managerAssignments = this.managerAssignments.map((assignment) => ({
      ...assignment,
    }));
    const driverAssignments = this.driverAssignments.map((assignment) => ({
      ...assignment,
    }));
    try {
      return await work({
        vehicles: {
          create: async (input) => {
            const now = new Date();
            const vehicle = {
              ...input,
              id: `vehicle-${this.vehicles.length + 1}`,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            };
            this.vehicles.push(vehicle);
            return vehicle;
          },
          update: async (vehicleId, fields) => {
            const vehicle = this.vehicles.find(({ id }) => id === vehicleId);
            if (!vehicle) throw new NotFoundException('Vehicle not found');
            Object.assign(vehicle, fields, { updatedAt: new Date() });
            return vehicle;
          },
          softDelete: async (vehicleId) => {
            const vehicle = this.vehicles.find(({ id }) => id === vehicleId);
            if (!vehicle) throw new NotFoundException('Vehicle not found');
            vehicle.deletedAt = new Date();
          },
        },
        vehicleAccess: {
          requireActor: async (companyId, userId, role) => {
            const valid = this.memberships.some(
              (membership) =>
                membership.userId === userId &&
                membership.companyId === companyId &&
                membership.role === role &&
                membership.status === 'active',
            );
            if (!valid) throw new ForbiddenException();
          },
          find: async (actor, vehicleId) => {
            const vehicle = this.vehicles.find(
              ({ id, companyId, deletedAt }) =>
                id === vehicleId &&
                companyId === actor.companyId &&
                deletedAt === null,
            );
            const activeMembership = this.memberships.some(
              (membership) =>
                membership.userId === actor.id &&
                membership.companyId === actor.companyId &&
                membership.role === actor.role &&
                membership.status === 'active',
            );
            const visible =
              activeMembership &&
              (isWorkspaceAdmin(actor.role) ||
                (actor.role === 'MANAGER' &&
                  this.managerAssignments.some(
                    (assignment) =>
                      assignment.vehicleId === vehicleId &&
                      assignment.managerId === actor.id &&
                      assignment.companyId === actor.companyId &&
                      assignment.assignedTo === null,
                  )));
            if (!vehicle || !visible) {
              throw new NotFoundException('Vehicle not found');
            }
            return vehicle;
          },
          findForHistory: async (actor, vehicleId) => {
            const vehicle = this.vehicles.find(
              ({ id, companyId }) =>
                id === vehicleId && companyId === actor.companyId,
            );
            const activeMembership = this.memberships.some(
              (membership) =>
                membership.userId === actor.id &&
                membership.companyId === actor.companyId &&
                membership.role === actor.role &&
                membership.status === 'active',
            );
            const visible =
              activeMembership &&
              (isWorkspaceAdmin(actor.role) ||
                (actor.role === 'MANAGER' &&
                  vehicle?.deletedAt === null &&
                  this.managerAssignments.some(
                    (assignment) =>
                      assignment.vehicleId === vehicleId &&
                      assignment.managerId === actor.id &&
                      assignment.assignedTo === null,
                  )));
            if (!vehicle || !visible) {
              throw new NotFoundException('Vehicle not found');
            }
            return vehicle;
          },
          sync: async (companyId, vehicleId, managerIds) => {
            const valid = managerIds.every((managerId) =>
              this.memberships.some(
                (membership) =>
                  membership.userId === managerId &&
                  membership.companyId === companyId &&
                  membership.role === 'MANAGER' &&
                  membership.status === 'active',
              ),
            );
            if (!valid) throw new BadRequestException('Invalid manager');
            const now = new Date();
            for (const assignment of this.managerAssignments) {
              if (
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId &&
                assignment.assignedTo === null &&
                !managerIds.includes(assignment.managerId)
              ) {
                assignment.assignedTo = now;
              }
            }
            this.managerAssignments.push(
              ...managerIds
                .filter(
                  (managerId) =>
                    !this.managerAssignments.some(
                      (assignment) =>
                        assignment.companyId === companyId &&
                        assignment.vehicleId === vehicleId &&
                        assignment.managerId === managerId &&
                        assignment.assignedTo === null,
                    ),
                )
                .map((managerId, index) => ({
                  id: `manager-assignment-${this.managerAssignments.length + index + 1}`,
                  companyId,
                  vehicleId,
                  managerId,
                  assignedFrom: now,
                  assignedTo: null,
                  createdAt: now,
                })),
            );
          },
          activeManagerIds: async (companyId, vehicleIds) =>
            new Map(
              vehicleIds.map((vehicleId) => [
                vehicleId,
                this.managerAssignments
                  .filter(
                    (assignment) =>
                      assignment.companyId === companyId &&
                      assignment.vehicleId === vehicleId &&
                      assignment.assignedTo === null,
                  )
                  .map(({ managerId }) => managerId),
              ]),
            ),
          closeVehicle: async (companyId, vehicleId) => {
            const now = new Date();
            for (const assignment of this.managerAssignments) {
              if (
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId &&
                assignment.assignedTo === null
              ) {
                assignment.assignedTo = now;
              }
            }
          },
        },
        drivers: {
          create: async (input) => {
            this.requireMembershipLink(input.companyId, input.userId);
            const driver = {
              ...input,
              id: `driver-${this.drivers.length + 1}`,
              deletedAt: null,
            };
            this.drivers.push(driver);
            return driver;
          },
          update: async (driverId, fields) => {
            const driver = this.drivers.find(({ id }) => id === driverId);
            if (!driver) throw new NotFoundException('Driver not found');
            if (fields.userId) {
              this.requireMembershipLink(
                driver.companyId,
                fields.userId,
                driverId,
              );
            }
            Object.assign(driver, fields);
            return driver;
          },
          softDelete: async (driverId) => {
            const driver = this.drivers.find(({ id }) => id === driverId);
            if (!driver) throw new NotFoundException('Driver not found');
            driver.deletedAt = new Date();
          },
          requireAll: async (companyId, driverIds) => {
            const valid = driverIds.every((driverId) =>
              this.drivers.some(
                (driver) =>
                  driver.id === driverId &&
                  driver.companyId === companyId &&
                  !driver.deletedAt,
              ),
            );
            if (!valid) throw new BadRequestException('Invalid driver');
          },
          requireOne: async (companyId, driverId) => {
            const valid = this.drivers.some(
              (driver) =>
                driver.id === driverId &&
                driver.companyId === companyId &&
                !driver.deletedAt,
            );
            if (!valid) throw new BadRequestException('Invalid driver');
          },
        },
        driverAllocations: {
          requireActor: async (actor) => {
            const valid =
              (isWorkspaceAdmin(actor.role) || actor.role === 'MANAGER') &&
              this.memberships.some(
                ({ userId, companyId, role, status }) =>
                  userId === actor.id &&
                  companyId === actor.companyId &&
                  role === actor.role &&
                  status === 'active',
              );
            if (!valid) throw new ForbiddenException();
          },
          find: async (actor, driverId) => {
            const driver = this.drivers.find(
              ({ id, companyId, deletedAt }) =>
                id === driverId && companyId === actor.companyId && !deletedAt,
            );
            const visible =
              driver &&
              (isWorkspaceAdmin(actor.role) ||
                (actor.role === 'MANAGER' &&
                  (!this.driverAssignments.some(
                    (assignment) =>
                      assignment.companyId === actor.companyId &&
                      assignment.driverId === driverId &&
                      assignment.assignedTo === null,
                  ) ||
                    this.driverAssignments.some(
                      (assignment) =>
                        assignment.companyId === actor.companyId &&
                        assignment.driverId === driverId &&
                        assignment.assignedTo === null &&
                        this.managerAssignments.some(
                          (access) =>
                            access.companyId === actor.companyId &&
                            access.vehicleId === assignment.vehicleId &&
                            access.managerId === actor.id &&
                            access.assignedTo === null,
                        ),
                    ))));
            if (!visible) throw new NotFoundException('Driver not found');
            return driver;
          },
          assign: async (companyId, vehicleId, driverId) => {
            const active = this.driverAssignments.find(
              (assignment) =>
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId &&
                assignment.assignedTo === null,
            );
            if (active?.driverId === driverId) return active;
            const now = new Date();
            if (active) active.assignedTo = now;
            const assignment = {
              id: `driver-assignment-${this.driverAssignments.length + 1}`,
              companyId,
              vehicleId,
              driverId,
              assignedFrom: now,
              assignedTo: null,
              createdAt: now,
            };
            this.driverAssignments.push(assignment);
            return assignment;
          },
          assignInitial: async (companyId, vehicleId, driverIds) => {
            if (driverIds.length > 1) {
              throw new BadRequestException('Only one active driver allowed');
            }
            if (!driverIds.length) return;
            const now = new Date();
            this.driverAssignments.push({
              id: `driver-assignment-${this.driverAssignments.length + 1}`,
              companyId,
              vehicleId,
              driverId: driverIds[0],
              assignedFrom: now,
              assignedTo: null,
              createdAt: now,
            });
          },
          unassign: async (companyId, vehicleId, driverId) => {
            const assignment = this.driverAssignments.find(
              (entry) =>
                entry.companyId === companyId &&
                entry.vehicleId === vehicleId &&
                entry.driverId === driverId &&
                entry.assignedTo === null,
            );
            if (!assignment) {
              throw new NotFoundException('Assignment not found');
            }
            assignment.assignedTo = new Date();
          },
          history: async (companyId, vehicleId) =>
            this.driverAssignments.filter(
              (assignment) =>
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId,
            ),
          activeDriverIds: async (companyId, vehicleIds) =>
            new Map(
              vehicleIds.map((vehicleId) => [
                vehicleId,
                this.driverAssignments
                  .filter(
                    (assignment) =>
                      assignment.companyId === companyId &&
                      assignment.vehicleId === vehicleId &&
                      assignment.assignedTo === null,
                  )
                  .map(({ driverId }) => driverId),
              ]),
            ),
          closeVehicle: async (companyId, vehicleId) => {
            const now = new Date();
            for (const assignment of this.driverAssignments) {
              if (
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId &&
                assignment.assignedTo === null
              ) {
                assignment.assignedTo = now;
              }
            }
          },
          closeDriver: async (companyId, driverId) => {
            const now = new Date();
            for (const assignment of this.driverAssignments) {
              if (
                assignment.companyId === companyId &&
                assignment.driverId === driverId &&
                assignment.assignedTo === null
              ) {
                assignment.assignedTo = now;
              }
            }
          },
        },
      });
    } catch (error) {
      this.vehicles.splice(0, this.vehicles.length, ...vehicles);
      this.drivers.splice(0, this.drivers.length, ...drivers);
      this.managerAssignments.splice(
        0,
        this.managerAssignments.length,
        ...managerAssignments,
      );
      this.driverAssignments.splice(
        0,
        this.driverAssignments.length,
        ...driverAssignments,
      );
      throw error;
    }
  }
}
