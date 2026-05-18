import { IsString, Length, Matches } from 'class-validator';
import { VERIFICATION_TOKEN_HEX_LENGTH } from '../verification-token.util';

export class VerifyEmailDto {
  @IsString()
  @Length(VERIFICATION_TOKEN_HEX_LENGTH, VERIFICATION_TOKEN_HEX_LENGTH)
  @Matches(/^[a-f0-9]+$/)
  token!: string;
}
