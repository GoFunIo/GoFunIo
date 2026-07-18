import { Expose, Transform } from 'class-transformer';
import { User } from '../users.entity';
import { MembershipRole } from '../membership-role';

export class UserDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  companyId!: string;

  @Expose()
  role!: MembershipRole;

  @Expose()
  firstName!: string | null;

  @Expose()
  lastName!: string | null;

  @Expose()
  phone!: string | null;

  @Expose()
  address!: string | null;

  @Expose()
  postalCode!: string | null;

  @Expose()
  city!: string | null;

  @Expose()
  pendingEmail!: string | null;

  @Expose()
  @Transform(({ obj }: { obj: User }) => obj.password !== null)
  hasPassword!: boolean;
}
