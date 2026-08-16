import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { CreateServiceDto } from './dtos/create-service.dto';
import { ListServicesQueryDto } from './dtos/list-services-query.dto';
import { UpdateServiceDto } from './dtos/update-service.dto';
import type { ServiceView } from './service-view';
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
  ): Promise<ServiceView[]> {
    if (!actor.companyId) return [];
    const vehicles = await this.vehicleAccess.visible(actor);
    const visible = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    const vehicleIds = query.vehicleId
      ? visible.has(query.vehicleId)
        ? [query.vehicleId]
        : []
      : [...visible.keys()];
    if (!vehicleIds.length) return [];
    const services = await this.services.find({
      where: { companyId: actor.companyId, vehicleId: In(vehicleIds) },
      order: { serviceDate: 'DESC', id: 'DESC' },
    });
    return services.map((service) =>
      this.view(service, visible.get(service.vehicleId)!),
    );
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

  private validateDate(value?: string): void {
    if (value && value > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Service date cannot be in the future');
    }
  }

  private view(service: FleetService, vehicle: FleetVehicle): ServiceView {
    return { ...service, vehicle };
  }
}
