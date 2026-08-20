import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { MAX_ATTACHMENT_SIZE } from './attachment-file';
import { AttachmentHttpErrorInterceptor } from './attachment-http-error.interceptor';
import { AttachmentDto } from './dtos/attachment.dto';
import type { ServiceAttachmentView } from './service-attachment-query';
import { ServiceAttachmentsService } from './service-attachments.service';

interface UploadedAttachment {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@ApiTags('Service Attachments')
@ApiCookieAuth('session')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Origin or Workspace access denied' })
@ApiNotFoundResponse({ description: 'Service or Vehicle not found' })
@Controller('services/:serviceId/attachments')
@UseGuards(SessionAuthGuard, AllowedOriginGuard)
@UseInterceptors(AttachmentHttpErrorInterceptor)
export class ServiceAttachmentsController {
  constructor(private readonly attachments: ServiceAttachmentsService) {}

  @ApiOperation({
    summary: 'List Service Attachments',
    description: 'Returns safe Attachment metadata newest first.',
  })
  @ApiOkResponse({ type: [AttachmentDto] })
  @Get()
  @Serialize(AttachmentDto)
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<ServiceAttachmentView[]> {
    return this.attachments.list(principal, serviceId);
  }

  @ApiOperation({
    summary: 'Create a Service Attachment',
    description:
      'Accepts exactly one PDF, JPEG, or PNG up to 10 MiB. Creation is at-least-once; after an ambiguous network error, refresh the collection before retrying.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['attachment'],
      properties: { attachment: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: AttachmentDto })
  @ApiBadRequestResponse({
    description: 'Attachment missing or content invalid',
  })
  @ApiPayloadTooLargeResponse({ description: 'Attachment exceeds 10 MiB' })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Attachment type not allowed',
  })
  @ApiConflictResponse({ description: 'Five active Attachments already exist' })
  @ApiServiceUnavailableResponse({
    description: 'Attachment storage unavailable',
  })
  @Post()
  @UseInterceptors(
    FileInterceptor('attachment', {
      limits: { files: 1, fileSize: MAX_ATTACHMENT_SIZE },
    }),
  )
  @Serialize(AttachmentDto)
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @UploadedFile() file?: UploadedAttachment,
  ): Promise<ServiceAttachmentView> {
    return this.attachments.create(
      principal,
      serviceId,
      file && {
        originalName: file.originalname,
        mimeType: file.mimetype,
        body: file.buffer,
      },
    );
  }
}
