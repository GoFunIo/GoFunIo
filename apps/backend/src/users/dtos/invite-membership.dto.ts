import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { lowercaseEmail } from '../../common/dto-transforms';
import { MembershipRole } from '../membership-role';

export class InviteMembershipDto {
  @Transform(lowercaseEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
