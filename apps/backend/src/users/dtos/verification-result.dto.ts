import { ApiProperty } from '@nestjs/swagger';

export class VerificationResultDto {
  @ApiProperty({ enum: [true], example: true })
  verified!: true;
}
