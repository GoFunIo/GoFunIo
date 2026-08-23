import { Expose, Type } from 'class-transformer';
import { AttachmentDto } from '../../service-attachments/dtos/attachment.dto';
import { ServiceType } from '../services.entity';

export class ServiceVehicleDto {
  @Expose()
  id!: string;

  @Expose()
  brand!: string;

  @Expose()
  model!: string;

  @Expose()
  registrationNumber!: string;
}

export class ServiceBaseDto {
  @Expose()
  id!: string;

  @Expose()
  vehicleId!: string;

  @Expose()
  serviceDate!: string;

  @Expose()
  type!: ServiceType;

  @Expose()
  cost!: string;

  @Expose()
  providerName!: string;

  @Expose()
  notes!: string | null;

  @Expose()
  @Type(() => ServiceVehicleDto)
  vehicle!: ServiceVehicleDto;
}

export class ServiceDto extends ServiceBaseDto {
  @Expose()
  @Type(() => AttachmentDto)
  attachments!: AttachmentDto[];
}
