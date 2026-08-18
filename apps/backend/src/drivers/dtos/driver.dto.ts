import { Expose, Type } from 'class-transformer';

export class DriverActiveVehicleDto {
  @Expose()
  id!: string;

  @Expose()
  brand!: string;

  @Expose()
  model!: string;

  @Expose()
  registrationNumber!: string;
}

export class DriverDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string | null;

  @Expose()
  phone!: string | null;

  @Expose()
  notes!: string | null;

  @Expose()
  userId!: string | null;

  @Expose()
  @Type(() => DriverActiveVehicleDto)
  activeVehicles!: DriverActiveVehicleDto[];
}
