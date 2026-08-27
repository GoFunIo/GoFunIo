import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  MoreThan,
  QueryFailedError,
} from 'typeorm';
import { Driver } from '../drivers/drivers.entity';
import { Service } from '../services/services.entity';
import { Vehicle } from '../vehicles/vehicles.entity';
import { ConflictCode, conflictException } from '../common/conflict';
import {
  type FleetTransaction,
  type FleetUnitOfWork,
  type FleetVehicle,
  type FleetVehicleInput,
} from './fleet-unit-of-work';
import { TypeOrmVehicleAccess } from './typeorm-vehicle-access';
import { TypeOrmDriverAllocation } from './typeorm-driver-allocation';
import { ServiceAttachment } from '../service-attachments/service-attachment.entity';
import { AttachmentObjectCleanup } from '../service-attachments/attachment-object-cleanup.entity';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { VehicleDeadlineNotificationWriter } from '../notifications/vehicle-deadline-notification-writer';

function throwMembershipLinkError(error: unknown): never {
  const constraint =
    error instanceof QueryFailedError
      ? (error.driverError as { constraint?: string } | undefined)?.constraint
      : undefined;
  if (constraint === 'FK_drivers_membership') {
    throw new BadRequestException('Invalid membership');
  }
  if (constraint === 'UQ_drivers_active_membership') {
    throw conflictException(
      'Membership already linked',
      ConflictCode.MEMBERSHIP_ALREADY_LINKED,
    );
  }
  throw error;
}

@Injectable()
export class TypeOrmFleetUnitOfWork implements FleetUnitOfWork {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly vehicleAccess: TypeOrmVehicleAccess,
    private readonly driverAllocation: TypeOrmDriverAllocation,
    private readonly deadlineNotifications: VehicleDeadlineNotificationWriter,
  ) {}

  transact<T>(work: (fleet: FleetTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work(this.transactionStores(manager)),
    );
  }

  private transactionStores(manager: EntityManager): FleetTransaction {
    const vehicleAccess = this.vehicleAccess.transactionStore(manager);
    const driverAllocations = this.driverAllocation.transactionStore(manager);
    const enqueueCleanup = async (objectKey: string, now: Date) => {
      await manager.upsert(
        AttachmentObjectCleanup,
        {
          objectKey,
          deleteAfter: now,
          nextAttemptAt: now,
          attempts: 0,
          lockedAt: null,
          lastError: null,
          completedAt: null,
        },
        ['objectKey'],
      );
    };
    const softDeleteAttachments = async (attachments: ServiceAttachment[]) => {
      if (!attachments.length) return;
      const now = new Date();
      for (const attachment of attachments) {
        await enqueueCleanup(attachment.objectKey, now);
      }
      await manager.softDelete(ServiceAttachment, {
        id: In(attachments.map(({ id }) => id)),
      });
    };
    const findService = async (
      companyId: string,
      serviceId: string,
      lock = false,
      vehicleId?: string,
    ) => {
      const service = await manager.findOne(Service, {
        where: {
          id: serviceId,
          companyId,
          ...(vehicleId && { vehicleId }),
        },
        ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      });
      if (!service) throw new NotFoundException('Service not found');
      return service;
    };
    const requireActor = async (actor: SessionPrincipal) => {
      const companyId = requireCompanyId(actor);
      if (!actor.role) throw new ForbiddenException();
      await vehicleAccess.requireActor(companyId, actor.id, actor.role);
      return companyId;
    };
    return {
      vehicles: {
        create: async (input: FleetVehicleInput): Promise<FleetVehicle> => {
          const vehicle = await manager.save(manager.create(Vehicle, input));
          return {
            id: vehicle.id,
            companyId: vehicle.companyId,
            brand: vehicle.brand,
            model: vehicle.model,
            productionYear: vehicle.productionYear,
            fuelType: vehicle.fuelType,
            vin: vehicle.vin,
            registrationNumber: vehicle.registrationNumber,
            currentMileage: vehicle.currentMileage,
            purchaseDate: vehicle.purchaseDate,
            ocExpiry: vehicle.ocExpiry,
            acExpiry: vehicle.acExpiry,
            technicalInspectionExpiry: vehicle.technicalInspectionExpiry,
            notes: vehicle.notes,
            createdAt: vehicle.createdAt,
            updatedAt: vehicle.updatedAt,
            deletedAt: vehicle.deletedAt,
          };
        },
        update: async (vehicleId, fields) => {
          await manager.update(Vehicle, vehicleId, fields);
          const vehicle = await manager.findOneBy(Vehicle, { id: vehicleId });
          if (!vehicle) throw new NotFoundException('Vehicle not found');
          return vehicle;
        },
        remove: async (actor, vehicleId) => {
          const companyId = await requireActor(actor);
          await vehicleAccess.find(actor, vehicleId, true);
          const attachments = await manager
            .createQueryBuilder(ServiceAttachment, 'attachment')
            .innerJoin(
              Service,
              'service',
              'service.id = attachment.serviceId AND service.companyId = attachment.companyId',
            )
            .where('attachment.companyId = :companyId', { companyId })
            .andWhere('service.vehicleId = :vehicleId', { vehicleId })
            .andWhere('attachment.deletedAt IS NULL')
            .setLock('pessimistic_write')
            .getMany();
          await softDeleteAttachments(attachments);
          await manager.softDelete(Service, { companyId, vehicleId });
          await vehicleAccess.closeVehicle(companyId, vehicleId);
          await driverAllocations.closeVehicle(companyId, vehicleId);
          await manager.softDelete(Vehicle, vehicleId);
        },
      },
      vehicleAccess,
      drivers: {
        create: async (input) => {
          try {
            return await manager.save(manager.create(Driver, input));
          } catch (error) {
            throwMembershipLinkError(error);
          }
        },
        update: async (driverId, fields) => {
          try {
            await manager.update(Driver, driverId, fields);
          } catch (error) {
            throwMembershipLinkError(error);
          }
          const driver = await manager.findOneBy(Driver, { id: driverId });
          if (!driver) throw new NotFoundException('Driver not found');
          return driver;
        },
        softDelete: async (driverId) => {
          await manager.softDelete(Driver, driverId);
        },
        requireOne: async (companyId, driverId) => {
          const driver = await manager.findOne(Driver, {
            where: { id: driverId, companyId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!driver) throw new BadRequestException('Invalid driver');
        },
      },
      driverAllocations,
      services: {
        create: (input) => manager.save(manager.create(Service, input)),
        find: findService,
        update: async (serviceId, fields) => {
          await manager.update(Service, serviceId, fields);
          const service = await manager.findOneBy(Service, { id: serviceId });
          if (!service) throw new NotFoundException('Service not found');
          return service;
        },
        remove: async (actor, serviceId) => {
          const companyId = await requireActor(actor);
          const service = await findService(companyId, serviceId);
          await vehicleAccess.find(actor, service.vehicleId, true);
          await findService(companyId, serviceId, true, service.vehicleId);
          const attachments = await manager.find(ServiceAttachment, {
            where: { companyId, serviceId, deletedAt: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          await softDeleteAttachments(attachments);
          await manager.softDelete(Service, serviceId);
        },
      },
      attachments: {
        countActive: (companyId, serviceId) =>
          manager.count(ServiceAttachment, {
            where: { companyId, serviceId, deletedAt: IsNull() },
          }),
        create: (input) =>
          manager.save(manager.create(ServiceAttachment, input)),
        find: async (companyId, serviceId, attachmentId, lock, withDeleted) => {
          const attachment = await manager.findOne(ServiceAttachment, {
            where: {
              id: attachmentId,
              companyId,
              serviceId,
              ...(withDeleted ? {} : { deletedAt: IsNull() }),
            },
            withDeleted,
            ...(lock ? { lock: { mode: 'pessimistic_write' } } : {}),
          });
          if (!attachment) throw new NotFoundException('Attachment not found');
          return attachment;
        },
        update: async (attachmentId, fields) => {
          await manager.update(ServiceAttachment, attachmentId, fields);
          const attachment = await manager.findOne(ServiceAttachment, {
            where: { id: attachmentId },
            withDeleted: true,
          });
          if (!attachment) throw new NotFoundException('Attachment not found');
          return attachment;
        },
        softDelete: async (attachmentId) => {
          await manager.softDelete(ServiceAttachment, attachmentId);
        },
      },
      attachmentCleanups: {
        guard: async (objectKey, deleteAfter) => {
          await manager.insert(AttachmentObjectCleanup, {
            objectKey,
            deleteAfter,
            nextAttemptAt: deleteAfter,
          });
        },
        cancel: async (objectKey, now) => {
          const result = await manager.delete(AttachmentObjectCleanup, {
            objectKey,
            completedAt: IsNull(),
            lockedAt: IsNull(),
            deleteAfter: MoreThan(now),
          });
          return result.affected === 1;
        },
        enqueue: enqueueCleanup,
      },
      notifications: {
        persistVehicleDeadlineStages: (vehicle, changedKinds) =>
          this.deadlineNotifications.persist(manager, vehicle, changedKinds),
      },
    };
  }
}
