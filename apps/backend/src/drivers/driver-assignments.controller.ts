import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { CreateDriverAssignmentDto } from './dtos/create-driver-assignment.dto';
import { DriverAssignmentDto } from './dtos/driver-assignment.dto';
import { DriverVehicleAssignment } from './driver-vehicle-assignment.entity';
import { DriversService } from './drivers.service';

@ApiTags('Drivers')
@Controller('vehicles/:vehicleId')
@UseGuards(SessionAuthGuard)
export class DriverAssignmentsController {
  constructor(private readonly drivers: DriversService) {}

  @ApiOperation({ summary: 'List driver assignment history for vehicle' })
  @ApiOkResponse({ type: DriverAssignmentDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @Get('driver-assignments')
  @Serialize(DriverAssignmentDto)
  history(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.drivers.assignmentHistory(principal, vehicleId);
  }

  @ApiOperation({ summary: 'Assign driver to vehicle' })
  @ApiCreatedResponse({ type: DriverAssignmentDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Vehicle or driver not found' })
  @ApiConflictResponse({ description: 'Driver already assigned' })
  @Post('drivers')
  @Serialize(DriverAssignmentDto)
  @UseGuards(AllowedOriginGuard)
  assign(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() body: CreateDriverAssignmentDto,
  ): Promise<DriverVehicleAssignment> {
    return this.drivers.assign(principal, vehicleId, body);
  }

  @ApiOperation({ summary: 'Unassign driver from vehicle' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Vehicle or assignment not found' })
  @Delete('drivers/:driverId')
  @HttpCode(204)
  @UseGuards(AllowedOriginGuard)
  unassign(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('driverId', ParseUUIDPipe) driverId: string,
  ): Promise<void> {
    return this.drivers.unassign(principal, vehicleId, driverId);
  }
}
