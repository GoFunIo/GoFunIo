import { Expose, Type } from 'class-transformer';
import { ServiceType } from '../services.entity';

export class ServiceVehicleDto {
  @Expose()
  id!: string;

  @Expose()
  brand!: string;

  @Expose()
  model!: string;

  @Expose()
  registrationNumber!: string;
}

export class ServiceDto {
  @Expose()
  id!: string;

  @Expose()
  vehicleId!: string;

  @Expose()
  serviceDate!: string;

  @Expose()
  type!: ServiceType;

  @Expose()
  cost!: string;

  @Expose()
  providerName!: string;

  @Expose()
  notes!: string | null;

  @Expose()
  @Type(() => ServiceVehicleDto)
  vehicle!: ServiceVehicleDto;
}
