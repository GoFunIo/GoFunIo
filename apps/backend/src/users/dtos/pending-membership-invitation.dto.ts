import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '../membership-role';

export class PendingMembershipInvitationDto {
  @ApiProperty({
    format: 'uuid',
    example: '2fd77abe-6a77-4cb7-9f7a-cf0b542643f5',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    example: '7fd77abe-6a77-4cb7-9f7a-cf0b542643f5',
  })
  companyId!: string;

  @ApiProperty({ example: 'Acme Fleet' })
  companyName!: string;

  @ApiProperty({ enum: MembershipRole, example: MembershipRole.MANAGER })
  role!: MembershipRole;

  @ApiProperty({ enum: ['pending'], example: 'pending' })
  status!: 'pending';

  @ApiProperty({ format: 'date-time', example: '2026-09-01T12:00:00.000Z' })
  expiresAt!: Date;
}
