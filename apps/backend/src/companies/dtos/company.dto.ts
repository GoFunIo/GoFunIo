import { Expose } from 'class-transformer';

export class CompanyDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  email!: string | null;

  @Expose()
  phone!: string | null;

  @Expose()
  taxId!: string | null;

  @Expose()
  address!: string | null;

  @Expose()
  postalCode!: string | null;

  @Expose()
  city!: string | null;
}
