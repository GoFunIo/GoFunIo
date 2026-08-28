import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConflictCode, conflictException } from '../common/conflict';
import { isWorkspaceAdmin, MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import type { VehicleFuelType } from '../vehicles/vehicles.entity';
import type {
  FleetManagerAssignment,
  FleetManagerProjection,
} from './vehicle-access';
import type { DriverAllocationStore } from './driver-allocation';
import type { ServiceType } from '../services/services.entity';
import type { ServiceAttachmentMimeType } from '../service-attachments/service-attachment.entity';
import type { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import type { VehicleDeadlineRecipientReconciliationScope } from '../notifications/transactional-notification-recipient-reconciliation';

// The in-memory unit of work mirrors asynchronous persistence interfaces while
// applying most operations synchronously to transaction-local collections.
/* eslint-disable @typescript-eslint/require-await */

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
  firstName?: string;
  lastName?: string;
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

export interface FleetServiceInput {
  companyId: string;
  vehicleId: string;
  serviceDate: string;
  type: ServiceType;
  cost: string;
  providerName: string;
  notes: string | null;
}

export interface FleetService extends FleetServiceInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FleetServiceAttachment {
  id: string;
  companyId: string;
  serviceId: string;
  objectKey: string;
  name: string;
  mimeType: ServiceAttachmentMimeType;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FleetAttachmentCleanup {
  id: string;
  objectKey: string;
  deleteAfter: Date;
  attempts: number;
  nextAttemptAt: Date;
  lockedAt: Date | null;
  lastError: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  assign(
    companyId: string,
    vehicleId: string,
    managerId: string,
  ): Promise<FleetManagerAssignment>;
  unassign(
    companyId: string,
    vehicleId: string,
    managerId: string,
  ): Promise<void>;
  activeManagers(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, FleetManagerProjection[]>>;
  closeVehicle(companyId: string, vehicleId: string): Promise<void>;
}

export interface FleetTransaction {
  vehicles: {
    create(input: FleetVehicleInput): Promise<FleetVehicle>;
    update(
      vehicleId: string,
      fields: Partial<Omit<FleetVehicleInput, 'companyId'>>,
    ): Promise<FleetVehicle>;
    remove(actor: SessionPrincipal, vehicleId: string): Promise<void>;
  };
  vehicleAccess: FleetVehicleAccessStore;
  drivers: {
    create(input: FleetDriverInput): Promise<FleetDriver>;
    update(
      driverId: string,
      fields: Partial<Omit<FleetDriverInput, 'companyId'>>,
    ): Promise<FleetDriver>;
    softDelete(driverId: string): Promise<void>;
    requireOne(companyId: string, driverId: string): Promise<void>;
  };
  driverAllocations: DriverAllocationStore;
  services: {
    create(input: FleetServiceInput): Promise<FleetService>;
    find(
      companyId: string,
      serviceId: string,
      lock?: boolean,
      vehicleId?: string,
    ): Promise<FleetService>;
    update(
      serviceId: string,
      fields: Partial<Omit<FleetServiceInput, 'companyId'>>,
    ): Promise<FleetService>;
    remove(actor: SessionPrincipal, serviceId: string): Promise<void>;
  };
  attachments: {
    countActive(companyId: string, serviceId: string): Promise<number>;
    create(
      input: Omit<
        FleetServiceAttachment,
        'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
      >,
    ): Promise<FleetServiceAttachment>;
    find(
      companyId: string,
      serviceId: string,
      attachmentId: string,
      lock?: boolean,
      withDeleted?: boolean,
    ): Promise<FleetServiceAttachment>;
    update(
      attachmentId: string,
      fields: Pick<
        FleetServiceAttachment,
        'objectKey' | 'name' | 'mimeType' | 'size'
      >,
    ): Promise<FleetServiceAttachment>;
    softDelete(attachmentId: string): Promise<void>;
  };
  attachmentCleanups: {
    guard(objectKey: string, deleteAfter: Date): Promise<void>;
    cancel(objectKey: string, now: Date): Promise<boolean>;
    enqueue(objectKey: string, now: Date): Promise<void>;
  };
  notifications: {
    persistVehicleDeadlineStages(
      vehicle: FleetVehicle,
      changedKinds: VehicleDeadlineKind[],
    ): Promise<void>;
    reconcileVehicleDeadlineRecipients(
      input: VehicleDeadlineRecipientReconciliationScope,
    ): Promise<void>;
  };
}

export interface FleetUnitOfWork {
  transact<T>(work: (fleet: FleetTransaction) => Promise<T>): Promise<T>;
}

export class FakeFleetUnitOfWork implements FleetUnitOfWork {
  readonly memberships: FleetMembership[] = [];
  readonly managerProfiles: FleetManagerProjection[] = [];
  readonly drivers: FleetDriver[] = [];
  readonly vehicles: FleetVehicle[] = [];
  readonly managerAssignments: FleetManagerAssignment[] = [];
  readonly driverAssignments: FleetDriverAssignment[] = [];
  readonly services: FleetService[] = [];
  readonly serviceAttachments: FleetServiceAttachment[] = [];
  readonly attachmentCleanups: FleetAttachmentCleanup[] = [];
  transactionActive = false;
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
    if (linked) {
      throw conflictException(
        'Membership already linked',
        ConflictCode.MEMBERSHIP_ALREADY_LINKED,
      );
    }
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
    const services = this.services.map((service) => ({ ...service }));
    const serviceAttachments = this.serviceAttachments.map((attachment) => ({
      ...attachment,
    }));
    const attachmentCleanups = this.attachmentCleanups.map((cleanup) => ({
      ...cleanup,
    }));
    const enqueueCleanup = (objectKey: string, now: Date): Promise<void> => {
      const existing = this.attachmentCleanups.find(
        (cleanup) => cleanup.objectKey === objectKey,
      );
      if (existing) {
        Object.assign(existing, {
          deleteAfter: now,
          nextAttemptAt: now,
          lockedAt: null,
          completedAt: null,
          updatedAt: now,
        });
        return Promise.resolve();
      }
      this.attachmentCleanups.push({
        id: `cleanup-${this.attachmentCleanups.length + 1}`,
        objectKey,
        deleteAfter: now,
        attempts: 0,
        nextAttemptAt: now,
        lockedAt: null,
        lastError: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return Promise.resolve();
    };
    this.transactionActive = true;
    try {
      const result = await work({
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
          remove: async (actor, vehicleId) => {
            const companyId = requireCompanyId(actor);
            if (!actor.role) throw new ForbiddenException();
            const activeMembership = this.memberships.some(
              ({ userId, companyId: ownerId, role, status }) =>
                userId === actor.id &&
                ownerId === companyId &&
                role === actor.role &&
                status === 'active',
            );
            if (!activeMembership) throw new ForbiddenException();
            const vehicle = this.vehicles.find(
              ({ id, companyId: ownerId, deletedAt }) =>
                id === vehicleId && ownerId === companyId && !deletedAt,
            );
            const visible =
              activeMembership &&
              (isWorkspaceAdmin(actor.role) ||
                (actor.role === MembershipRole.MANAGER &&
                  this.managerAssignments.some(
                    (assignment) =>
                      assignment.companyId === companyId &&
                      assignment.vehicleId === vehicleId &&
                      assignment.managerId === actor.id &&
                      assignment.assignedTo === null,
                  )));
            if (!vehicle || !visible) {
              throw new NotFoundException('Vehicle not found');
            }

            const now = new Date();
            const serviceIds = new Set(
              this.services
                .filter(
                  (service) =>
                    service.companyId === companyId &&
                    service.vehicleId === vehicleId &&
                    !service.deletedAt,
                )
                .map(({ id }) => id),
            );
            for (const attachment of this.serviceAttachments) {
              if (
                attachment.companyId === companyId &&
                serviceIds.has(attachment.serviceId) &&
                !attachment.deletedAt
              ) {
                await enqueueCleanup(attachment.objectKey, now);
                attachment.deletedAt = now;
              }
            }
            for (const service of this.services) {
              if (serviceIds.has(service.id)) service.deletedAt = now;
            }
            for (const assignment of this.managerAssignments) {
              if (
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId &&
                assignment.assignedTo === null
              ) {
                assignment.assignedTo = now;
              }
            }
            for (const assignment of this.driverAssignments) {
              if (
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId &&
                assignment.assignedTo === null
              ) {
                assignment.assignedTo = now;
              }
            }
            vehicle.deletedAt = now;
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
                (actor.role === MembershipRole.MANAGER &&
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
                (actor.role === MembershipRole.MANAGER &&
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
          assign: async (companyId, vehicleId, managerId) => {
            const valid = this.memberships.some(
              (membership) =>
                membership.userId === managerId &&
                membership.companyId === companyId &&
                membership.role === MembershipRole.MANAGER &&
                membership.status === 'active',
            );
            if (!valid) throw new BadRequestException('Invalid manager');
            const active = this.managerAssignments.find(
              (assignment) =>
                assignment.companyId === companyId &&
                assignment.vehicleId === vehicleId &&
                assignment.managerId === managerId &&
                assignment.assignedTo === null,
            );
            if (active) return active;
            const now = new Date();
            const assignment = {
              id: `manager-assignment-${this.managerAssignments.length + 1}`,
              companyId,
              vehicleId,
              managerId,
              assignedFrom: now,
              assignedTo: null,
              createdAt: now,
            };
            this.managerAssignments.push(assignment);
            return assignment;
          },
          unassign: async (companyId, vehicleId, managerId) => {
            const assignment = this.managerAssignments.find(
              (entry) =>
                entry.companyId === companyId &&
                entry.vehicleId === vehicleId &&
                entry.managerId === managerId &&
                entry.assignedTo === null,
            );
            if (!assignment) {
              throw new NotFoundException('Assignment not found');
            }
            assignment.assignedTo = new Date();
          },
          activeManagers: async (companyId, vehicleIds) =>
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
                  .flatMap(({ managerId }) => {
                    const manager = this.managerProfiles.find(
                      ({ id }) => id === managerId,
                    );
                    return manager ? [manager] : [];
                  }),
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
              (isWorkspaceAdmin(actor.role) ||
                actor.role === MembershipRole.MANAGER) &&
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
                (actor.role === MembershipRole.MANAGER &&
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
                assignment.driverId === driverId &&
                assignment.assignedTo === null,
            );
            if (active) return active;
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
          activeDrivers: async (companyId, vehicleIds) =>
            new Map(
              vehicleIds.map((vehicleId) => [
                vehicleId,
                this.driverAssignments
                  .filter(
                    (entry) =>
                      entry.companyId === companyId &&
                      entry.vehicleId === vehicleId &&
                      entry.assignedTo === null,
                  )
                  .flatMap((assignment) => {
                    const driver = this.drivers.find(
                      (entry) =>
                        entry.companyId === companyId &&
                        entry.id === assignment.driverId,
                    );
                    return driver
                      ? [
                          {
                            id: driver.id,
                            firstName: driver.firstName ?? '',
                            lastName: driver.lastName ?? '',
                          },
                        ]
                      : [];
                  }),
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
        services: {
          create: (input) => {
            const now = new Date();
            const service = {
              ...input,
              id: `service-${this.services.length + 1}`,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            };
            this.services.push(service);
            return Promise.resolve(service);
          },
          find: (companyId, serviceId, _lock, vehicleId) => {
            const service = this.services.find(
              ({
                id,
                companyId: ownerId,
                vehicleId: ownerVehicleId,
                deletedAt,
              }) =>
                id === serviceId &&
                ownerId === companyId &&
                (!vehicleId || ownerVehicleId === vehicleId) &&
                !deletedAt,
            );
            return service
              ? Promise.resolve(service)
              : Promise.reject(new NotFoundException('Service not found'));
          },
          update: (serviceId, fields) => {
            const service = this.services.find(({ id }) => id === serviceId);
            if (!service) {
              return Promise.reject(new NotFoundException('Service not found'));
            }
            Object.assign(service, fields, { updatedAt: new Date() });
            return Promise.resolve(service);
          },
          remove: async (actor, serviceId) => {
            const companyId = requireCompanyId(actor);
            if (!actor.role) throw new ForbiddenException();
            const activeMembership = this.memberships.some(
              ({ userId, companyId: ownerId, role, status }) =>
                userId === actor.id &&
                ownerId === companyId &&
                role === actor.role &&
                status === 'active',
            );
            if (!activeMembership) throw new ForbiddenException();
            const service = this.services.find(
              ({ id, companyId: ownerId, deletedAt }) =>
                id === serviceId && ownerId === companyId && !deletedAt,
            );
            if (!service) {
              throw new NotFoundException('Service not found');
            }
            const visible =
              activeMembership &&
              (isWorkspaceAdmin(actor.role) ||
                (actor.role === MembershipRole.MANAGER &&
                  this.managerAssignments.some(
                    (assignment) =>
                      assignment.companyId === companyId &&
                      assignment.vehicleId === service.vehicleId &&
                      assignment.managerId === actor.id &&
                      assignment.assignedTo === null,
                  )));
            if (!visible) throw new NotFoundException('Vehicle not found');

            const now = new Date();
            for (const attachment of this.serviceAttachments) {
              if (
                attachment.companyId === companyId &&
                attachment.serviceId === serviceId &&
                !attachment.deletedAt
              ) {
                await enqueueCleanup(attachment.objectKey, now);
                attachment.deletedAt = now;
              }
            }
            service.deletedAt = now;
          },
        },
        attachments: {
          countActive: (companyId, serviceId) =>
            Promise.resolve(
              this.serviceAttachments.filter(
                (attachment) =>
                  attachment.companyId === companyId &&
                  attachment.serviceId === serviceId &&
                  !attachment.deletedAt,
              ).length,
            ),
          create: (input) => {
            const now = new Date();
            const attachment: FleetServiceAttachment = {
              ...input,
              id: `attachment-${this.serviceAttachments.length + 1}`,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            };
            this.serviceAttachments.push(attachment);
            return Promise.resolve(attachment);
          },
          find: (companyId, serviceId, attachmentId, _lock, withDeleted) => {
            const attachment = this.serviceAttachments.find(
              (entry) =>
                entry.id === attachmentId &&
                entry.companyId === companyId &&
                entry.serviceId === serviceId &&
                (withDeleted || !entry.deletedAt),
            );
            if (!attachment) {
              return Promise.reject(
                new NotFoundException('Attachment not found'),
              );
            }
            return Promise.resolve(attachment);
          },
          update: (attachmentId, fields) => {
            const attachment = this.serviceAttachments.find(
              ({ id }) => id === attachmentId,
            );
            if (!attachment) {
              return Promise.reject(
                new NotFoundException('Attachment not found'),
              );
            }
            Object.assign(attachment, fields, { updatedAt: new Date() });
            return Promise.resolve(attachment);
          },
          softDelete: (attachmentId) => {
            const attachment = this.serviceAttachments.find(
              ({ id }) => id === attachmentId,
            );
            if (attachment && !attachment.deletedAt) {
              attachment.deletedAt = new Date();
            }
            return Promise.resolve();
          },
        },
        attachmentCleanups: {
          guard: (objectKey, deleteAfter) => {
            const now = new Date();
            this.attachmentCleanups.push({
              id: `cleanup-${this.attachmentCleanups.length + 1}`,
              objectKey,
              deleteAfter,
              attempts: 0,
              nextAttemptAt: deleteAfter,
              lockedAt: null,
              lastError: null,
              completedAt: null,
              createdAt: now,
              updatedAt: now,
            });
            return Promise.resolve();
          },
          cancel: (objectKey, now) => {
            const index = this.attachmentCleanups.findIndex(
              (cleanup) =>
                cleanup.objectKey === objectKey &&
                !cleanup.completedAt &&
                !cleanup.lockedAt &&
                cleanup.deleteAfter > now,
            );
            if (index < 0) return Promise.resolve(false);
            this.attachmentCleanups.splice(index, 1);
            return Promise.resolve(true);
          },
          enqueue: enqueueCleanup,
        },
        notifications: {
          reconcileVehicleDeadlineRecipients: () => Promise.resolve(),
          persistVehicleDeadlineStages: () => Promise.resolve(),
        },
      });
      this.transactionActive = false;
      return result;
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
      this.services.splice(0, this.services.length, ...services);
      this.serviceAttachments.splice(
        0,
        this.serviceAttachments.length,
        ...serviceAttachments,
      );
      this.attachmentCleanups.splice(
        0,
        this.attachmentCleanups.length,
        ...attachmentCleanups,
      );
      this.transactionActive = false;
      throw error;
    }
  }
}
