import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { VehicleDeadlineKind } from '../vehicle-deadline-alert-policy.entity';

export class VehicleDeadlineAlertPolicyDto {
  @ApiProperty({
    enum: VehicleDeadlineKind,
    isArray: true,
    example: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
  })
  @Expose()
  enabledDeadlineKinds!: VehicleDeadlineKind[];

  @ApiProperty({
    type: [Number],
    minItems: 1,
    maxItems: 10,
    example: [30, 14, 7, 0],
    description: 'Distinct lead days in decreasing order; 0 is the due date.',
  })
  @Expose()
  leadDays!: number[];

  @ApiProperty({
    example: 'Europe/Warsaw',
    description: 'IANA time-zone identifier used for Workspace calendar time.',
  })
  @Expose()
  timeZone!: string;
}
