import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { ApiAllowedOrigin, ApiSessionAuth } from '../common/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { NotificationPreferencesDto } from './dtos/notification-preferences.dto';
import { UpdateNotificationPreferencesDto } from './dtos/update-notification-preferences.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('Notification Preferences')
@ApiSessionAuth()
@Controller('notification-preferences/me')
@UseGuards(SessionAuthGuard)
@Serialize(NotificationPreferencesDto)
export class NotificationPreferencesController {
  constructor(
    private readonly notificationPreferences: NotificationPreferencesService,
  ) {}

  @ApiOperation({
    summary: 'Get effective preferences for the current Membership',
  })
  @ApiOkResponse({ type: NotificationPreferencesDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No active Membership' })
  @Get()
  get(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.notificationPreferences.get(principal);
  }

  @ApiOperation({
    summary: 'Update preferences for the current Membership',
    description:
      'Idempotently upserts only supplied categories in the Active Workspace. Changes affect only future optional delivery decisions.',
  })
  @ApiAllowedOrigin()
  @ApiOkResponse({ type: NotificationPreferencesDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No active Membership' })
  @ApiBadRequestResponse({
    description:
      'Validation failed: provide 1–5 distinct supported categories and at least one valid preference value per category. Tenant and recipient identity are not accepted.',
  })
  @Patch()
  @UseGuards(AllowedOriginGuard)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationPreferences.update(principal, body);
  }
}
