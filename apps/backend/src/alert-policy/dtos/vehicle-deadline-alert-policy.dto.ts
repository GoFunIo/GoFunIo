import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class VehicleDeadlineAlertPolicyDto {
  @ApiProperty({
    type: String,
    isArray: true,
    example: ['OC', 'AC', 'TECHNICAL_INSPECTION'],
    description: 'Built-in kinds or custom kind ids of this Workspace.',
  })
  @Expose()
  enabledDeadlineKinds!: string[];

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
