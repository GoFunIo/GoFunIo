import { Expose } from 'class-transformer';

export class DriverDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string | null;

  @Expose()
  phone!: string | null;

  @Expose()
  notes!: string | null;
}
