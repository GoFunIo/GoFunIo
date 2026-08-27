import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ApiAllowedOrigin, ApiSessionAuth } from '../common/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { AlertPolicyService } from './alert-policy.service';
import { VehicleDeadlineAlertPolicyDto } from './dtos/vehicle-deadline-alert-policy.dto';
import { UpdateVehicleDeadlineAlertPolicyDto } from './dtos/update-vehicle-deadline-alert-policy.dto';

@ApiTags('Alert Policy')
@ApiSessionAuth()
@Controller('alert-policy')
@UseGuards(SessionAuthGuard)
@Serialize(VehicleDeadlineAlertPolicyDto)
export class AlertPolicyController {
  constructor(private readonly alertPolicy: AlertPolicyService) {}

  @ApiOperation({
    summary: 'Get the Active Workspace Vehicle Deadline Alert Policy',
  })
  @ApiOkResponse({ type: VehicleDeadlineAlertPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Alert policy not found' })
  @Get()
  get(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.alertPolicy.get(principal);
  }

  @ApiOperation({
    summary: 'Update the Active Workspace Vehicle Deadline Alert Policy',
    description:
      'Requires OWNER or ADMIN. Every accepted change starts a new activation boundary.',
  })
  @ApiAllowedOrigin()
  @ApiOkResponse({ type: VehicleDeadlineAlertPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'OWNER or ADMIN role required' })
  @ApiBadRequestResponse({
    description:
      'Validation failed: kinds must be supported and distinct; leadDays must contain 1–10 distinct integers from 0 through 365; timeZone must be a valid IANA identifier.',
  })
  @ApiNotFoundResponse({ description: 'Alert policy not found' })
  @Patch()
  @UseGuards(AllowedOriginGuard, AdminGuard)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: UpdateVehicleDeadlineAlertPolicyDto,
  ) {
    return this.alertPolicy.update(principal, body);
  }
}
