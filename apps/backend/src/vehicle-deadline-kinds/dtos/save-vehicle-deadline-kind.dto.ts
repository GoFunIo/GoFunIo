import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SaveVehicleDeadlineKindDto {
  @ApiProperty({ example: 'Wymiana rozrządu', maxLength: 60 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^\P{Cc}+$/u, {
    message: 'label must not contain control characters',
  })
  label!: string;
}
