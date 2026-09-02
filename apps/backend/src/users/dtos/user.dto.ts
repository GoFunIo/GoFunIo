import { Expose, Transform } from 'class-transformer';
import { MembershipRole } from '../membership-role';
import type { CurrentUserView } from '../current-user-view';

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
  @Transform(({ obj }: { obj: CurrentUserView }) =>
    obj.companyId === undefined ? undefined : Boolean(obj.hasPassword),
  )
  hasPassword!: boolean;

  @Expose()
  @Transform(({ obj }: { obj: { carsCount?: number } }) =>
    obj.carsCount === undefined ? undefined : Number(obj.carsCount),
  )
  carsCount?: number;
}
