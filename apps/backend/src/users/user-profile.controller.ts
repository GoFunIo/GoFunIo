import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Patch,
  Session,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import type { SessionData } from '../types/session.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangeEmailDto } from './dtos/change-email.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserDto } from './dtos/user.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { User } from './users.entity';
import { UsersService } from './users.service';

@Controller('users/me')
export class UserProfileController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Patch()
  @Serialize(UserDto)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  updateProfile(
    @CurrentUser() user: User,
    @Body() body: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.update(user.id, body);
  }

  @Patch('email')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestEmailChange(
    @CurrentUser() user: User,
    @Body() body: ChangeEmailDto,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    await this.authService.requestEmailChange(
      user,
      body.email,
      body.currentPassword,
      origin,
    );
  }

  @Patch('password')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: ChangePasswordDto,
    @Session() session: SessionData,
  ): Promise<void> {
    session.passwordVersion = await this.authService.changePassword(
      user,
      body.currentPassword,
      body.newPassword,
    );
  }
}
