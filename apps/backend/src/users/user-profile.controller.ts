import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Patch,
  Session,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import type { SessionData } from '../types/session.types';
import { AuthService } from './auth.service';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { ChangeEmailDto } from './dtos/change-email.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserDto } from './dtos/user.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { User } from './users.entity';
import { UsersService } from './users.service';
import type { SessionPrincipal } from './session-principal';
import { SessionsService } from './sessions.service';
import { EmailChangeService } from './email-change.service';

@Controller('users/me')
export class UserProfileController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private sessions: SessionsService,
    private emailChange: EmailChangeService,
  ) {}

  @Patch()
  @Serialize(UserDto)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  updateProfile(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.update(principal.id, body);
  }

  @Patch('email')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestEmailChange(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: ChangeEmailDto,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    await this.emailChange.request(
      principal.id,
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
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: ChangePasswordDto,
    @Session() session: SessionData,
  ): Promise<void> {
    const user = await this.usersService.findActiveById(principal.id);
    if (!user) throw new UnauthorizedException();
    await this.authService.changePassword(
      user,
      body.currentPassword,
      body.newPassword,
    );
    await this.sessions.establish(session, principal.id);
  }
}
