import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  ApiAllowedOrigin,
  ApiSessionAuth,
  ApiUuidParam,
} from '../common/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import {
  NotificationListDto,
  VehicleDeadlineNotificationDto,
} from './dtos/notification.dto';
import { ListNotificationsQueryDto } from './dtos/list-notifications-query.dto';
import {
  ReadAllNotificationsDto,
  ReadAllNotificationsResultDto,
} from './dtos/read-all-notifications.dto';
import { NotificationsService } from './notifications.service';
import { NotificationSseTransport } from '../notification-changes/notification-sse-transport';
import { requireCompanyId } from '../users/session-principal';
import { NotificationStreamQueryDto } from './dtos/notification-stream-query.dto';

@ApiTags('Notifications')
@ApiSessionAuth()
@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly streams: NotificationSseTransport,
  ) {}
  @ApiOperation({
    summary: 'List current authorized Notifications',
    description:
      'Uses the cookie Session Principal and its Active Workspace; tenant scope cannot be supplied by the client. Returns only currently valid and authorized recipient items, supports category/unread/archive filters, and paginates newest-first with an opaque cursor.',
  })
  @ApiOkResponse({ type: NotificationListDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No active Workspace Membership' })
  @ApiBadRequestResponse({
    description: 'Invalid filter, limit, or opaque cursor.',
  })
  @Get()
  @Serialize(NotificationListDto)
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.list(principal, query);
  }

  @ApiOperation({
    summary: 'Open a content-free Notification invalidation stream',
    description:
      'Uses the cookie Session Principal Active Workspace and accepts no client-selected tenant or token. Events have no business payload. After open, reconnect, or notification.changed, refetch authoritative state with normal GET requests; replay and Last-Event-ID are not supported.',
  })
  @ApiOkResponse({
    description:
      'SSE with only notification.changed events, server reconnect hint and content-free heartbeat comments.',
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No active Workspace Membership' })
  @ApiBadRequestResponse({
    description:
      'Query parameters are not accepted; stream scope is session-only.',
  })
  @Get('stream')
  stream(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query() query: NotificationStreamQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): void {
    if (Object.keys(query).length) {
      throw new BadRequestException('Stream scope comes from the session');
    }
    this.streams.open(
      { companyId: requireCompanyId(principal), userId: principal.id },
      request,
      response,
    );
  }

  @ApiOperation({
    summary: 'Get an authorized typed Notification',
    description:
      'Masks foreign, invalid, revoked, or currently inaccessible data as not found. The action descriptor is computed from current typed source data and authorization for frontend deep links.',
  })
  @ApiUuidParam('id', 'Notification id')
  @ApiOkResponse({ type: VehicleDeadlineNotificationDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No active Workspace Membership' })
  @ApiBadRequestResponse({ description: 'Notification id is not a UUID.' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @Get(':id')
  @Serialize(VehicleDeadlineNotificationDto)
  detail(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.detail(principal, id);
  }

  @ApiOperation({
    summary: 'Mark all currently visible Notifications as read',
    description:
      'Idempotently updates only valid, currently authorized, unrevoked, unarchived caller Recipients. An optional category narrows the operation; repeated calls are safe.',
  })
  @ApiAllowedOrigin()
  @ApiOkResponse({ type: ReadAllNotificationsResultDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Origin not allowed' })
  @ApiBadRequestResponse({ description: 'Unsupported category or body.' })
  @Post('read-all')
  @HttpCode(200)
  @UseGuards(AllowedOriginGuard)
  @Serialize(ReadAllNotificationsResultDto)
  readAll(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: ReadAllNotificationsDto,
  ) {
    return this.notifications.readAll(principal, body.category);
  }

  @ApiOperation({
    summary: 'Mark the caller Recipient as read',
    description:
      'Idempotently fills only the caller Recipient readAt after current validity and authorization checks.',
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Notification id')
  @ApiOkResponse({ type: VehicleDeadlineNotificationDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Origin not allowed' })
  @ApiBadRequestResponse({ description: 'Notification id is not a UUID.' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @Patch(':id/read')
  @UseGuards(AllowedOriginGuard)
  @Serialize(VehicleDeadlineNotificationDto)
  markRead(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(principal, id);
  }

  @ApiOperation({
    summary: 'Archive the caller Recipient',
    description:
      'Idempotently fills only the caller Recipient archivedAt and fills readAt when absent, after current validity and authorization checks.',
  })
  @ApiAllowedOrigin()
  @ApiUuidParam('id', 'Notification id')
  @ApiOkResponse({ type: VehicleDeadlineNotificationDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Origin not allowed' })
  @ApiBadRequestResponse({ description: 'Notification id is not a UUID.' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @Patch(':id/archive')
  @UseGuards(AllowedOriginGuard)
  @Serialize(VehicleDeadlineNotificationDto)
  archive(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.archive(principal, id);
  }
}
