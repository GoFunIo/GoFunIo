import { Expose } from 'class-transformer';

export class DriverAssignmentDto {
  @Expose()
  id!: string;

  @Expose()
  driverId!: string;

  @Expose()
  vehicleId!: string;

  @Expose()
  assignedFrom!: Date;

  @Expose()
  assignedTo!: Date | null;

  @Expose()
  createdAt!: Date;
}
