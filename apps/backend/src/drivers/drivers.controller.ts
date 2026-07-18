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
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentPrincipal } from '../users/decorators/current-principal.decorator';
import { AdminGuard } from '../users/guards/admin.guard';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import type { SessionPrincipal } from '../users/session-principal';
import { CreateDriverDto } from './dtos/create-driver.dto';
import { DriverDto } from './dtos/driver.dto';
import { UpdateDriverDto } from './dtos/update-driver.dto';
import { Driver } from './drivers.entity';
import { DriversService } from './drivers.service';

@Controller('drivers')
@Serialize(DriverDto)
@UseGuards(SessionAuthGuard)
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  list(@CurrentPrincipal() principal: SessionPrincipal): Promise<Driver[]> {
    return this.drivers.list(principal);
  }

  @Get(':id')
  findOne(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Driver> {
    return this.drivers.findOne(principal, id);
  }

  @Post()
  @UseGuards(AllowedOriginGuard)
  create(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: CreateDriverDto,
  ): Promise<Driver> {
    return this.drivers.create(principal, body);
  }

  @Patch(':id')
  @UseGuards(AllowedOriginGuard)
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDriverDto,
  ): Promise<Driver> {
    return this.drivers.update(principal, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard, AllowedOriginGuard)
  remove(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.drivers.remove(principal, id);
  }
}
