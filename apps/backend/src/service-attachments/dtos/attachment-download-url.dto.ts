import { ApiProperty } from '@nestjs/swagger';

export class AttachmentDownloadUrlDto {
  @ApiProperty({
    description:
      'Private download URL valid for 300 seconds. Use as a browser navigation target.',
    format: 'uri',
  })
  url!: string;
}
