import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TOKEN_HEX_LENGTH } from '../token.util';

export class ResetPasswordDto {
  @IsString()
  @Length(TOKEN_HEX_LENGTH, TOKEN_HEX_LENGTH)
  @Matches(/^[a-f0-9]+$/)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
