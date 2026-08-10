import { Expose, Type } from 'class-transformer';
import { VehicleFuelType } from '../vehicles.entity';

export class VehicleManagerDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string | null;

  @Expose()
  lastName!: string | null;

  @Expose()
  email!: string;
}

export class VehicleDriverDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;
}

export class VehicleDto {
  @Expose()
  id!: string;

  @Expose()
  @Type(() => VehicleManagerDto)
  managers!: VehicleManagerDto[];

  @Expose()
  @Type(() => VehicleDriverDto)
  driver!: VehicleDriverDto | null;

  @Expose()
  brand!: string;

  @Expose()
  model!: string;

  @Expose()
  productionYear!: number | null;

  @Expose()
  fuelType!: VehicleFuelType | null;

  @Expose()
  vin!: string | null;

  @Expose()
  registrationNumber!: string;

  @Expose()
  currentMileage!: number | null;

  @Expose()
  purchaseDate!: string | null;

  @Expose()
  ocExpiry!: string | null;

  @Expose()
  acExpiry!: string | null;

  @Expose()
  technicalInspectionExpiry!: string | null;

  @Expose()
  notes!: string | null;
}
