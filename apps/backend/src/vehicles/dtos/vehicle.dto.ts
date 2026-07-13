import { Expose } from 'class-transformer';
import { VehicleFuelType } from '../vehicles.entity';

export class VehicleDto {
  @Expose()
  id!: string;

  @Expose()
  managerIds!: string[];

  @Expose()
  driverIds!: string[];

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
