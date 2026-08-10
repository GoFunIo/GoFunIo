import { IsString, Length } from 'class-validator';
import { TOKEN_HEX_LENGTH } from '../token.util';

export class AcceptMembershipInvitationDto {
  @IsString()
  @Length(TOKEN_HEX_LENGTH, TOKEN_HEX_LENGTH)
  token!: string;
}
