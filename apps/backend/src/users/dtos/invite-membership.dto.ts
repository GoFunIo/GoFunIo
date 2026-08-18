import { Transform } from 'class-transformer';
import { IsEmail, IsIn, MaxLength } from 'class-validator';
import { lowercaseEmail } from '../../common/dto-transforms';
import { MembershipRole } from '../membership-role';

export class InviteMembershipDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn([MembershipRole.ADMIN, MembershipRole.MANAGER])
  role!: MembershipRole;
}
