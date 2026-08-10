import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { InviteMembershipDto } from './dtos/invite-membership.dto';
import { AcceptMembershipInvitationDto } from './dtos/accept-membership-invitation.dto';
import { AdminGuard } from './guards/admin.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { MembershipInvitationsService } from './membership-invitations.service';
import { requireCompanyId, SessionPrincipal } from './session-principal';

@Controller()
export class MembershipInvitationsController {
  constructor(private readonly invitations: MembershipInvitationsService) {}

  @Post('users/invitations')
  @UseGuards(SessionAuthGuard, AdminGuard, AllowedOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  invite(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: InviteMembershipDto,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    return this.invitations.invite(
      requireCompanyId(principal),
      body.email,
      body.role,
      origin,
    );
  }

  @Get('auth/invitations')
  @UseGuards(SessionAuthGuard)
  list(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.invitations.listPending(principal.id);
  }

  @Post('auth/invitations/accept')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  acceptToken(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: AcceptMembershipInvitationDto,
  ): Promise<void> {
    return this.invitations.acceptToken(principal.id, body.token);
  }

  @Post('auth/invitations/:membershipId/decline')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  decline(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ): Promise<void> {
    return this.invitations.decline(principal.id, membershipId);
  }

  @Post('auth/invitations/:membershipId/accept')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  acceptId(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ): Promise<void> {
    return this.invitations.acceptId(principal.id, membershipId);
  }
}
