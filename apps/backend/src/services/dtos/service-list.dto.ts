import { Expose, Type } from 'class-transformer';
import { ServiceBaseDto } from './service.dto';

export class ServiceListItemDto extends ServiceBaseDto {
  @Expose()
  attachmentCount!: number;

  @Expose()
  hasAttachment!: boolean;
}

export class ServiceListDto {
  @Expose()
  @Type(() => ServiceListItemDto)
  items!: ServiceListItemDto[];

  @Expose()
  total!: number;

  @Expose()
  totalCost!: string;

  @Expose()
  page!: number;

  @Expose()
  pageSize!: number;

  @Expose()
  totalPages!: number;
}
