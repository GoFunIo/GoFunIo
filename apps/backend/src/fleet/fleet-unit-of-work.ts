import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { MembershipRole } from '../users/membership-role';
import type { SessionPrincipal } from '../users/session-principal';
import type { VehicleFuelType } from '../vehicles/vehicles.entity';
import type { FleetManagerAssignment } from './vehicle-access';

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
    requireAll(companyId: string, driverIds: string[]): Promise<void>;
    requireOne(companyId: string, driverId: string): Promise<void>;
  };
  driverAllocations: {
    assign(
      companyId: string,
      vehicleId: string,
      driverId: string,
    ): Promise<FleetDriverAssignment>;
    assignInitial(
      companyId: string,
      vehicleId: string,
      driverIds: string[],
    ): Promise<void>;
    unassign(
      companyId: string,
      vehicleId: string,
      driverId: string,
    ): Promise<void>;
    history(
      companyId: string,
      vehicleId: string,
    ): Promise<FleetDriverAssignment[]>;
    activeDriverIds(
      companyId: string,
      vehicleIds: string[],
    ): Promise<Map<string, string[]>>;
    closeVehicle(companyId: string, vehicleId: string): Promise<void>;
  };
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

  private async run<T>(
    work: (fleet: FleetTransaction) => Promise<T>,
  ): Promise<T> {
    const vehicles = this.vehicles.map((vehicle) => ({ ...vehicle }));
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
              (actor.role === 'ADMIN' ||
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
              (actor.role === 'ADMIN' ||
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
          requireAll: async (companyId, driverIds) => {
            const valid = driverIds.every((driverId) =>
              this.drivers.some(
                (driver) =>
                  driver.id === driverId && driver.companyId === companyId,
              ),
            );
            if (!valid) throw new BadRequestException('Invalid driver');
          },
          requireOne: async (companyId, driverId) => {
            const valid = this.drivers.some(
              (driver) =>
                driver.id === driverId && driver.companyId === companyId,
            );
            if (!valid) throw new BadRequestException('Invalid driver');
          },
        },
        driverAllocations: {
          assign: async (companyId, vehicleId, driverId) => {
            if (
              this.driverAssignments.some(
                (assignment) =>
                  assignment.companyId === companyId &&
                  assignment.vehicleId === vehicleId &&
                  assignment.driverId === driverId &&
                  assignment.assignedTo === null,
              )
            ) {
              throw new ConflictException('Driver already assigned');
            }
            const now = new Date();
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
            for (const driverId of driverIds) {
              const now = new Date();
              this.driverAssignments.push({
                id: `driver-assignment-${this.driverAssignments.length + 1}`,
                companyId,
                vehicleId,
                driverId,
                assignedFrom: now,
                assignedTo: null,
                createdAt: now,
              });
            }
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
        },
      });
    } catch (error) {
      this.vehicles.splice(0, this.vehicles.length, ...vehicles);
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
