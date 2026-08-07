import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleLinkDto {
  @IsString()
  @IsNotEmpty()
  credential!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
