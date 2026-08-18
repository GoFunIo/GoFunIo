import { IsUUID } from 'class-validator';

export class CreateManagerAssignmentDto {
  @IsUUID('4')
  managerId!: string;
}
