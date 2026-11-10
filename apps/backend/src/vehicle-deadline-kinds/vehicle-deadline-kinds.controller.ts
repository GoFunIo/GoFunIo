import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { ConflictResponseDto } from '../common/conflict';
import { ApiAllowedOrigin, ApiSessionAuth } from '../common/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { AdminGuard } from '../users/guards/admin.guard';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { SaveVehicleDeadlineKindDto } from './dtos/save-vehicle-deadline-kind.dto';
import { VehicleDeadlineKindDto } from './dtos/vehicle-deadline-kind.dto';
import { VehicleDeadlineKindsService } from './vehicle-deadline-kinds.service';

@ApiTags('Vehicle Deadline Kinds')
@ApiSessionAuth()
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@Controller('vehicle-deadline-kinds')
@UseGuards(SessionAuthGuard)
@Serialize(VehicleDeadlineKindDto)
export class VehicleDeadlineKindsController {
  constructor(private readonly kinds: VehicleDeadlineKindsService) {}

  @ApiOperation({
    summary: 'List built-in and custom deadline kinds of the Active Workspace',
  })
  @ApiOkResponse({ type: VehicleDeadlineKindDto, isArray: true })
  @Get()
  list(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.kinds.list(principal);
  }

  @ApiOperation({
    summary: 'Create a custom deadline kind and enable it in the Alert Policy',
    description: 'Requires OWNER or ADMIN.',
  })
  @ApiAllowedOrigin()
  @ApiCreatedResponse({ type: VehicleDeadlineKindDto })
  @ApiForbiddenResponse({ description: 'OWNER or ADMIN role required' })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description: 'Label already used or custom kind limit reached',
  })
  @Post()
  @UseGuards(AllowedOriginGuard, AdminGuard)
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: SaveVehicleDeadlineKindDto,
  ) {
    return this.kinds.create(principal, body);
  }

  @ApiOperation({
    summary: 'Rename a custom deadline kind',
    description:
      'Requires OWNER or ADMIN. Already generated Notifications keep the label they were created with.',
  })
  @ApiAllowedOrigin()
  @ApiOkResponse({ type: VehicleDeadlineKindDto })
  @ApiForbiddenResponse({ description: 'OWNER or ADMIN role required' })
  @ApiNotFoundResponse({ description: 'Deadline kind not found' })
  @ApiConflictResponse({
    type: ConflictResponseDto,
    description: 'Label already used',
  })
  @Patch(':id')
  @UseGuards(AllowedOriginGuard, AdminGuard)
  rename(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SaveVehicleDeadlineKindDto,
  ) {
    return this.kinds.rename(principal, id, body);
  }

  @ApiOperation({
    summary: 'Delete a custom deadline kind and its Vehicle dates',
    description: 'Requires OWNER or ADMIN.',
  })
  @ApiAllowedOrigin()
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'OWNER or ADMIN role required' })
  @ApiNotFoundResponse({ description: 'Deadline kind not found' })
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AllowedOriginGuard, AdminGuard)
  remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.kinds.remove(principal, id);
  }
}
