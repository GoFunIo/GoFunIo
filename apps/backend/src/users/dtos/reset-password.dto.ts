import { IsString, Length, Matches } from 'class-validator';
import { TOKEN_HEX_LENGTH } from '../token.util';
import { IsNewPassword } from '../password-policy';

export class ResetPasswordDto {
  @IsString()
  @Length(TOKEN_HEX_LENGTH, TOKEN_HEX_LENGTH)
  @Matches(/^[a-f0-9]+$/)
  token!: string;

  @IsString()
  @IsNewPassword()
  password!: string;
}
