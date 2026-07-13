import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { User, UserRole } from '../users/users.entity';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import {
  ListVehiclesQueryDto,
  SortOrder,
  VehicleExpiryType,
  VehicleSortBy,
} from './dtos/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { Vehicle } from './vehicles.entity';

const sortColumns: Record<VehicleSortBy, string> = {
  [VehicleSortBy.CREATED_AT]: 'vehicle.createdAt',
  [VehicleSortBy.BRAND]: 'vehicle.brand',
  [VehicleSortBy.MODEL]: 'vehicle.model',
  [VehicleSortBy.PRODUCTION_YEAR]: 'vehicle.productionYear',
  [VehicleSortBy.CURRENT_MILEAGE]: 'vehicle.currentMileage',
  [VehicleSortBy.OC_EXPIRY]: 'vehicle.ocExpiry',
  [VehicleSortBy.AC_EXPIRY]: 'vehicle.acExpiry',
  [VehicleSortBy.INSPECTION_EXPIRY]: 'vehicle.technicalInspectionExpiry',
};

const expiryColumns: Record<VehicleExpiryType, string> = {
  [VehicleExpiryType.OC]: 'vehicle.ocExpiry',
  [VehicleExpiryType.AC]: 'vehicle.acExpiry',
  [VehicleExpiryType.INSPECTION]: 'vehicle.technicalInspectionExpiry',
};

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
  ) {}

  async list(actor: User, query: ListVehiclesQueryDto) {
    const qb = this.vehicles
      .createQueryBuilder('vehicle')
      .where('vehicle.companyId = :companyId', { companyId: actor.companyId })
      .andWhere('vehicle.deletedAt IS NULL');
    if (actor.role === UserRole.MANAGER) {
      qb.andWhere('vehicle.managerId = :managerId', { managerId: actor.id });
    }

    if (query.search) {
      const search = this.escapeLike(query.search);
      const compact = this.escapeLike(
        query.search.toUpperCase().replace(/[\s-]/g, ''),
      );
      qb.andWhere(
        `(vehicle.brand ILIKE :search ESCAPE '!'
          OR vehicle.model ILIKE :search ESCAPE '!'
          OR vehicle.vin ILIKE :compact ESCAPE '!'
          OR vehicle.registrationNumber ILIKE :compact ESCAPE '!')`,
        { search: `%${search}%`, compact: `%${compact}%` },
      );
    }

    if (query.expiresWithinDays && !query.expiryType) {
      throw new BadRequestException('expiryType is required');
    }
    if (query.expiryType) {
      const today = this.dateOnly(new Date());
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + (query.expiresWithinDays ?? 30));
      qb.andWhere(
        `${expiryColumns[query.expiryType]} BETWEEN :today AND :end`,
        {
          today,
          end: this.dateOnly(end),
        },
      );
    }

    const order = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(sortColumns[query.sortBy], order, 'NULLS LAST')
      .addOrderBy('vehicle.id', order)
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findOne(actor: User, id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOneBy({
      id,
      companyId: actor.companyId,
      ...(actor.role === UserRole.MANAGER ? { managerId: actor.id } : {}),
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async create(actor: User, body: CreateVehicleDto): Promise<Vehicle> {
    this.validateProductionYear(body.productionYear);
    this.validatePurchaseDate(body.purchaseDate);
    try {
      return await this.vehicles.manager.transaction(async (manager) => {
        const currentActor = await this.lockActor(manager, actor);
        if (
          currentActor.role === UserRole.MANAGER &&
          body.managerId &&
          body.managerId !== currentActor.id
        ) {
          throw new ForbiddenException();
        }
        const managerId =
          currentActor.role === UserRole.MANAGER
            ? currentActor.id
            : await this.validateManager(
                manager,
                currentActor.companyId,
                body.managerId,
              );
        return manager.save(
          manager.create(Vehicle, {
            ...body,
            companyId: currentActor.companyId,
            managerId,
            productionYear: body.productionYear ?? null,
            fuelType: body.fuelType ?? null,
            vin: body.vin ?? null,
            currentMileage: body.currentMileage ?? null,
            purchaseDate: body.purchaseDate ?? null,
            ocExpiry: body.ocExpiry ?? null,
            acExpiry: body.acExpiry ?? null,
            technicalInspectionExpiry: body.technicalInspectionExpiry ?? null,
            notes: body.notes ?? null,
          }),
        );
      });
    } catch (error) {
      this.throwConflict(error);
    }
  }

  async update(
    actor: User,
    id: string,
    body: UpdateVehicleDto,
  ): Promise<Vehicle> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('No changes provided');
    }
    this.validateProductionYear(body.productionYear);
    this.validatePurchaseDate(body.purchaseDate);
    try {
      return await this.vehicles.manager.transaction(async (manager) => {
        const currentActor = await this.lockActor(manager, actor);
        if (
          currentActor.role === UserRole.MANAGER &&
          body.managerId !== undefined
        ) {
          throw new ForbiddenException();
        }
        const managerId =
          currentActor.role === UserRole.ADMIN && body.managerId !== undefined
            ? await this.validateManager(
                manager,
                currentActor.companyId,
                body.managerId,
              )
            : undefined;
        const vehicle = await manager.findOne(Vehicle, {
          where: {
            id,
            companyId: currentActor.companyId,
            ...(currentActor.role === UserRole.MANAGER
              ? { managerId: currentActor.id }
              : {}),
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (!vehicle) throw new NotFoundException('Vehicle not found');
        Object.assign(vehicle, body);
        if (managerId !== undefined) vehicle.managerId = managerId;
        return manager.save(vehicle);
      });
    } catch (error) {
      this.throwConflict(error);
    }
  }

  async remove(actor: User, id: string): Promise<void> {
    await this.vehicles.manager.transaction(async (manager) => {
      const currentActor = await this.lockActor(manager, actor);
      const query = manager
        .createQueryBuilder()
        .softDelete()
        .from(Vehicle)
        .where('id = :id', { id })
        .andWhere('"companyId" = :companyId', {
          companyId: currentActor.companyId,
        })
        .andWhere('"deletedAt" IS NULL');
      if (currentActor.role === UserRole.MANAGER) {
        query.andWhere('"managerId" = :managerId', {
          managerId: currentActor.id,
        });
      }
      const result = await query.execute();
      if ((result.affected ?? 0) === 0) {
        throw new NotFoundException('Vehicle not found');
      }
    });
  }

  private validatePurchaseDate(value?: string | null): void {
    if (value && value > this.dateOnly(new Date())) {
      throw new BadRequestException('Purchase date cannot be in the future');
    }
  }

  private validateProductionYear(value?: number | null): void {
    if (value && value > new Date().getFullYear()) {
      throw new BadRequestException('Production year cannot be in the future');
    }
  }

  private async validateManager(
    manager: EntityManager,
    companyId: string,
    managerId?: string | null,
  ): Promise<string | null> {
    if (!managerId) return null;
    const exists = await manager.findOne(User, {
      where: { id: managerId, companyId, role: UserRole.MANAGER },
      lock: { mode: 'pessimistic_write' },
    });
    if (!exists) throw new BadRequestException('Invalid manager');
    return managerId;
  }

  private async lockActor(manager: EntityManager, actor: User): Promise<User> {
    const current = await manager.findOne(User, {
      where: { id: actor.id, companyId: actor.companyId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!current) throw new ForbiddenException();
    return current;
  }

  private escapeLike(value: string): string {
    return value.replace(/[!%_]/g, '!$&');
  }

  private dateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private throwConflict(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const constraint = (
        error.driverError as { constraint?: string } | undefined
      )?.constraint;
      if (constraint === 'IDX_vehicles_company_registration_active') {
        throw new ConflictException('Registration number already in use');
      }
      if (constraint === 'IDX_vehicles_company_vin_active') {
        throw new ConflictException('VIN already in use');
      }
    }
    throw error;
  }
}
