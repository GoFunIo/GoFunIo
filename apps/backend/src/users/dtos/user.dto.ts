import { Expose } from 'class-transformer';
import { UserRole } from '../users.entity';

export class UserDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  companyId!: string;

  @Expose()
  role!: UserRole;
}
