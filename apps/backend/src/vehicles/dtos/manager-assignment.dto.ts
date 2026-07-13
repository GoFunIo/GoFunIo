import { Expose } from 'class-transformer';

export class ManagerAssignmentDto {
  @Expose()
  id!: string;

  @Expose()
  managerId!: string;

  @Expose()
  vehicleId!: string;

  @Expose()
  assignedFrom!: Date;

  @Expose()
  assignedTo!: Date | null;

  @Expose()
  createdAt!: Date;
}
