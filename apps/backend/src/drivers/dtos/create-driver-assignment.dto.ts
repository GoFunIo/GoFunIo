import { IsUUID } from 'class-validator';

export class CreateDriverAssignmentDto {
  @IsUUID()
  driverId!: string;
}
