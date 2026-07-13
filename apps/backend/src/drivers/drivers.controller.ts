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
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { AdminGuard } from '../users/guards/admin.guard';
import { SessionAuthGuard } from '../users/guards/session-auth.guard';
import { User } from '../users/users.entity';
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
  list(@CurrentUser() user: User): Promise<Driver[]> {
    return this.drivers.list(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Driver> {
    return this.drivers.findOne(user, id);
  }

  @Post()
  @UseGuards(AllowedOriginGuard)
  create(
    @CurrentUser() user: User,
    @Body() body: CreateDriverDto,
  ): Promise<Driver> {
    return this.drivers.create(user, body);
  }

  @Patch(':id')
  @UseGuards(AllowedOriginGuard)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDriverDto,
  ): Promise<Driver> {
    return this.drivers.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard, AllowedOriginGuard)
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.drivers.remove(user, id);
  }
}
