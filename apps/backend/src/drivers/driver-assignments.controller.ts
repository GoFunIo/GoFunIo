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
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import { User } from '../users/users.entity';
import { CreateDriverAssignmentDto } from './dtos/create-driver-assignment.dto';
import { DriverAssignmentDto } from './dtos/driver-assignment.dto';
import { DriverVehicleAssignment } from './driver-vehicle-assignment.entity';
import { DriversService } from './drivers.service';

@Controller('vehicles/:vehicleId')
@UseGuards(SessionAuthGuard)
export class DriverAssignmentsController {
  constructor(private readonly drivers: DriversService) {}

  @Get('driver-assignments')
  @Serialize(DriverAssignmentDto)
  history(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.drivers.assignmentHistory(user, vehicleId);
  }

  @Post('drivers')
  @Serialize(DriverAssignmentDto)
  @UseGuards(AllowedOriginGuard)
  assign(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() body: CreateDriverAssignmentDto,
  ): Promise<DriverVehicleAssignment> {
    return this.drivers.assign(user, vehicleId, body);
  }

  @Delete('drivers/:driverId')
  @HttpCode(204)
  @UseGuards(AllowedOriginGuard)
  unassign(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('driverId', ParseUUIDPipe) driverId: string,
  ): Promise<void> {
    return this.drivers.unassign(user, vehicleId, driverId);
  }
}
