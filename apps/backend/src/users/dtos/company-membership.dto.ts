import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '../membership-role';

export class CompanyMembershipDto {
  @ApiProperty({
    format: 'uuid',
    example: '7fd77abe-6a77-4cb7-9f7a-cf0b542643f5',
  })
  id!: string;

  @ApiProperty({ example: 'Acme Fleet' })
  name!: string;

  @ApiProperty({ enum: MembershipRole, example: MembershipRole.ADMIN })
  role!: MembershipRole;
}
