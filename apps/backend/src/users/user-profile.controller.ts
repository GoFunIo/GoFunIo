import {
  Body,
  Controller,
  Delete,
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
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { ChangeEmailDto } from './dtos/change-email.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserDto } from './dtos/user.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import type { SessionPrincipal } from './session-principal';
import { SessionsService } from './sessions.service';
import { EmailChangeService } from './email-change.service';
import { CredentialAuthenticationService } from './credential-authentication.service';
import { CompanyUsersService } from './company-users.service';
import { Inject } from '@nestjs/common';
import { USER_PROFILES, type UserProfiles } from './user-profiles';
import type { CurrentUserView } from './current-user-view';

@Controller('users/me')
export class UserProfileController {
  constructor(
    @Inject(USER_PROFILES) private readonly userProfiles: UserProfiles,
    private sessions: SessionsService,
    private emailChange: EmailChangeService,
    private credentials: CredentialAuthenticationService,
    private companyUsers: CompanyUsersService,
  ) {}

  @Delete()
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  leave(@CurrentPrincipal() principal: SessionPrincipal): Promise<void> {
    return this.companyUsers.leave(principal);
  }

  @Patch()
  @Serialize(UserDto)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  updateProfile(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: UpdateProfileDto,
  ): Promise<CurrentUserView> {
    return this.userProfiles.update(principal.id, body).then((account) => ({
      ...account,
      companyId: principal.companyId,
      role: principal.role,
    }));
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
    const passwordVersion = await this.credentials.changePassword(
      principal.id,
      body.currentPassword,
      body.newPassword,
    );
    await this.sessions.establish(session, principal.id, passwordVersion);
  }
}
