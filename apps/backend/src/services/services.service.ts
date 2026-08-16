import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FLEET_UNIT_OF_WORK,
  type FleetService,
  type FleetUnitOfWork,
  type FleetVehicle,
} from '../fleet/fleet-unit-of-work';
import { VEHICLE_ACCESS, type VehicleAccess } from '../fleet/vehicle-access';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { isWorkspaceAdmin, MembershipRole } from '../users/membership-role';
import { CreateServiceDto } from './dtos/create-service.dto';
import { ListServicesQueryDto } from './dtos/list-services-query.dto';
import { UpdateServiceDto } from './dtos/update-service.dto';
import type { ServicePage, ServiceView } from './service-view';
import { Service } from './services.entity';

@Injectable()
export class ServicesService {
  constructor(
    @Inject(FLEET_UNIT_OF_WORK) private readonly fleet: FleetUnitOfWork,
    @Inject(VEHICLE_ACCESS) private readonly vehicleAccess: VehicleAccess,
    @InjectRepository(Service) private readonly services: Repository<Service>,
  ) {}

  async list(
    actor: SessionPrincipal,
    query: ListServicesQueryDto,
  ): Promise<ServicePage> {
    const companyId = requireCompanyId(actor);
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from cannot be after to');
    }
    if (
      !actor.role ||
      (!isWorkspaceAdmin(actor.role) && actor.role !== MembershipRole.MANAGER)
    ) {
      throw new ForbiddenException();
    }
    if (query.vehicleId) await this.vehicleAccess.find(actor, query.vehicleId);

    const filtered = this.services
      .createQueryBuilder('service')
      .innerJoinAndSelect('service.vehicle', 'vehicle')
      .where('service.companyId = :companyId', { companyId })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "memberships" actor_membership
          WHERE actor_membership."userId" = :actorId
            AND actor_membership."companyId" = service."companyId"
            AND actor_membership.role = :actorRole
            AND actor_membership.status = 'active'
        )`,
        { actorId: actor.id, actorRole: actor.role },
      );
    if (actor.role === MembershipRole.MANAGER) {
      filtered.andWhere(
        `EXISTS (
          SELECT 1 FROM "manager_vehicle_assignments" assignment
          WHERE assignment."vehicleId" = service."vehicleId"
            AND assignment."companyId" = service."companyId"
            AND assignment."managerId" = :managerId
            AND assignment."assignedTo" IS NULL
        )`,
        { managerId: actor.id },
      );
    }
    if (query.vehicleId) {
      filtered.andWhere('service.vehicleId = :vehicleId', {
        vehicleId: query.vehicleId,
      });
    }
    if (query.type) {
      filtered.andWhere('service.type = :type', { type: query.type });
    }
    if (query.providerName) {
      filtered.andWhere("service.providerName ILIKE :providerName ESCAPE '!'", {
        providerName: `%${query.providerName.replace(/[!%_]/g, '!$&')}%`,
      });
    }
    if (query.from) {
      filtered.andWhere('service.serviceDate >= :from', { from: query.from });
    }
    if (query.to) {
      filtered.andWhere('service.serviceDate <= :to', { to: query.to });
    }

    const aggregate = await filtered
      .clone()
      .select('COUNT(*)', 'total')
      .addSelect('COALESCE(SUM(service.cost), 0)', 'totalCost')
      .getRawOne<{ total: string; totalCost: string }>();
    const total = Number(aggregate?.total ?? 0);
    const services = await filtered
      .orderBy('service.serviceDate', 'DESC')
      .addOrderBy('service.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getMany();
    return {
      items: services.map((service) => ({
        ...this.view(service, service.vehicle),
        hasAttachment: service.attachmentKey !== null,
      })),
      total,
      totalCost: this.money(aggregate?.totalCost ?? '0'),
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  findOne(actor: SessionPrincipal, id: string): Promise<ServiceView> {
    return this.fleet.transact(async (fleet) => {
      const service = await fleet.services.find(requireCompanyId(actor), id);
      const vehicle = await fleet.vehicleAccess.find(actor, service.vehicleId);
      return this.view(service, vehicle);
    });
  }

  create(
    actor: SessionPrincipal,
    body: CreateServiceDto,
  ): Promise<ServiceView> {
    this.validateDate(body.serviceDate);
    return this.fleet.transact(async (fleet) => {
      const companyId = requireCompanyId(actor);
      if (!actor.role) throw new ForbiddenException();
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      const vehicle = await fleet.vehicleAccess.find(
        actor,
        body.vehicleId,
        true,
      );
      const service = await fleet.services.create({
        ...body,
        companyId,
        cost: body.cost.toFixed(2),
        notes: body.notes ?? null,
      });
      return this.view(service, vehicle);
    });
  }

  update(
    actor: SessionPrincipal,
    id: string,
    body: UpdateServiceDto,
  ): Promise<ServiceView> {
    if (!Object.keys(body).length) {
      throw new BadRequestException('No changes provided');
    }
    this.validateDate(body.serviceDate);
    return this.fleet.transact(async (fleet) => {
      const companyId = requireCompanyId(actor);
      if (!actor.role) throw new ForbiddenException();
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      const existing = await fleet.services.find(companyId, id);
      await fleet.vehicleAccess.find(actor, existing.vehicleId, true);
      const vehicle = await fleet.vehicleAccess.find(
        actor,
        body.vehicleId ?? existing.vehicleId,
        true,
      );
      const { cost, ...fields } = body;
      const service = await fleet.services.update(id, {
        ...fields,
        ...(cost === undefined ? {} : { cost: cost.toFixed(2) }),
      });
      return this.view(service, vehicle);
    });
  }

  async remove(actor: SessionPrincipal, id: string): Promise<void> {
    await this.fleet.transact(async (fleet) => {
      const companyId = requireCompanyId(actor);
      if (!actor.role) throw new ForbiddenException();
      await fleet.vehicleAccess.requireActor(companyId, actor.id, actor.role);
      const service = await fleet.services.find(companyId, id);
      await fleet.vehicleAccess.find(actor, service.vehicleId, true);
      await fleet.services.find(companyId, id, true, service.vehicleId);
      await fleet.services.softDelete(id);
    });
  }

  private validateDate(value?: string): void {
    if (value && value > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Service date cannot be in the future');
    }
  }

  private view(service: FleetService, vehicle: FleetVehicle): ServiceView {
    return { ...service, vehicle };
  }

  private money(value: string): string {
    const [whole, fraction = ''] = value.split('.');
    return `${whole}.${fraction.padEnd(2, '0')}`;
  }
}
