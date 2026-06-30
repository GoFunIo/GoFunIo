import { IsString, Length, Matches, MinLength } from 'class-validator';
import { VERIFICATION_TOKEN_HEX_LENGTH } from '../verification-token.util';

export class ResetPasswordDto {
  @IsString()
  @Length(VERIFICATION_TOKEN_HEX_LENGTH, VERIFICATION_TOKEN_HEX_LENGTH)
  @Matches(/^[a-f0-9]+$/)
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
