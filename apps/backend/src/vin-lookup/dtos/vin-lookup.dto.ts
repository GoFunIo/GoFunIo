import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { VehicleFuelType } from '../../vehicles/vehicles.entity';

export class VinLookupDto {
  @ApiProperty({ example: '1HGCM82633A004352' })
  @Expose()
  vin!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Honda' })
  @Expose()
  brand!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Accord' })
  @Expose()
  model!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2003,
    description:
      'Model year encoded in the VIN; may differ from production year.',
  })
  @Expose()
  year!: number | null;

  @ApiProperty({ enum: VehicleFuelType, nullable: true, example: 'PETROL' })
  @Expose()
  fuelType!: VehicleFuelType | null;
}
