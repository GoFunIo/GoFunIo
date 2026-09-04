import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Redirect,
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
  ApiFoundResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import { ApiAllowedOrigin } from '../common/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { MAX_ATTACHMENT_SIZE } from './attachment-file';
import { AttachmentHttpErrorInterceptor } from './attachment-http-error.interceptor';
import { AttachmentDto } from './dtos/attachment.dto';
import { AttachmentDownloadUrlDto } from './dtos/attachment-download-url.dto';
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
  @ApiAllowedOrigin()
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

  @ApiOperation({
    summary: 'Download a Service Attachment',
    description:
      'Verifies the private object and redirects to a five-minute presigned download URL.',
  })
  @ApiFoundResponse({ description: 'Redirect to the private download URL' })
  @ApiServiceUnavailableResponse({
    description: 'Attachment storage unavailable or inconsistent',
  })
  @Get(':attachmentId')
  @Redirect(undefined, HttpStatus.FOUND)
  async download(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<{ url: string }> {
    const url = await this.attachments.download(
      principal,
      serviceId,
      attachmentId,
    );
    return { url: url.toString() };
  }

  @ApiOperation({
    summary: 'Get a Service Attachment download URL',
    description:
      'Authorizes access and verifies the private object, then returns a five-minute presigned download URL as JSON. Fetch this endpoint to handle API errors, then navigate the browser to the returned URL.',
  })
  @ApiOkResponse({ type: AttachmentDownloadUrlDto })
  @ApiBadRequestResponse({ description: 'Invalid Service or Attachment UUID' })
  @ApiServiceUnavailableResponse({
    description: 'Attachment storage unavailable or inconsistent',
  })
  @Get(':attachmentId/download-url')
  @Header('Cache-Control', 'private, no-store')
  async downloadUrl(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<AttachmentDownloadUrlDto> {
    const url = await this.attachments.download(
      principal,
      serviceId,
      attachmentId,
    );
    return { url: url.toString() };
  }

  @ApiOperation({
    summary: 'Preview a Service Attachment image',
    description:
      'Authorizes access and redirects JPEG or PNG Attachments to a five-minute private presigned URL with inline disposition. PDF preview returns ATTACHMENT_PREVIEW_NOT_AVAILABLE.',
  })
  @ApiFoundResponse({ description: 'Redirect to the private inline image URL' })
  @ApiUnsupportedMediaTypeResponse({
    description: 'ATTACHMENT_PREVIEW_NOT_AVAILABLE for PDF Attachments',
  })
  @ApiServiceUnavailableResponse({
    description: 'Attachment storage unavailable or inconsistent',
  })
  @Get(':attachmentId/preview')
  @Header('Cache-Control', 'private, no-store')
  @Redirect(undefined, HttpStatus.FOUND)
  async preview(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<{ url: string }> {
    const url = await this.attachments.preview(
      principal,
      serviceId,
      attachmentId,
    );
    return { url: url.toString() };
  }

  @ApiOperation({
    summary: 'Replace a Service Attachment',
    description:
      'Replaces the file under a fresh immutable object key while preserving Attachment identity and creation time.',
  })
  @ApiAllowedOrigin()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['attachment'],
      properties: { attachment: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: AttachmentDto })
  @ApiBadRequestResponse({
    description: 'Attachment missing or content invalid',
  })
  @ApiPayloadTooLargeResponse({ description: 'Attachment exceeds 10 MiB' })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Attachment type not allowed',
  })
  @ApiServiceUnavailableResponse({
    description: 'Attachment storage unavailable or inconsistent',
  })
  @Put(':attachmentId')
  @UseInterceptors(
    FileInterceptor('attachment', {
      limits: { files: 1, fileSize: MAX_ATTACHMENT_SIZE },
    }),
  )
  @Serialize(AttachmentDto)
  replace(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @UploadedFile() file?: UploadedAttachment,
  ): Promise<ServiceAttachmentView> {
    return this.attachments.replace(
      principal,
      serviceId,
      attachmentId,
      file && {
        originalName: file.originalname,
        mimeType: file.mimetype,
        body: file.buffer,
      },
    );
  }

  @ApiOperation({ summary: 'Delete a Service Attachment' })
  @ApiAllowedOrigin()
  @ApiNoContentResponse({
    description: 'Attachment deleted or was already deleted',
  })
  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<void> {
    return this.attachments.delete(principal, serviceId, attachmentId);
  }
}
