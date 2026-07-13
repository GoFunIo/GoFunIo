import { Expose, Type } from 'class-transformer';
import { VehicleDto } from './vehicle.dto';

export class VehicleListDto {
  @Expose()
  @Type(() => VehicleDto)
  items!: VehicleDto[];

  @Expose()
  page!: number;

  @Expose()
  pageSize!: number;

  @Expose()
  total!: number;

  @Expose()
  totalPages!: number;
}
