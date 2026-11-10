import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class VehicleDeadlineKindDto {
  @ApiProperty({
    example: 'OC',
    description:
      'Stable key: a built-in kind or the custom kind id. Use it in enabledDeadlineKinds and customDeadlines.',
  })
  @Expose()
  key!: string;

  @ApiProperty({ example: 'Wymiana oleju' })
  @Expose()
  label!: string;

  @ApiProperty({ description: 'Built-in kinds cannot be renamed or deleted.' })
  @Expose()
  builtIn!: boolean;
}
