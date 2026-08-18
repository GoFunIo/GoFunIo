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
import {
  ApiBadRequestResponse,
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
import { Throttle } from '@nestjs/throttler';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { ConflictResponseDto } from '../common/conflict';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { InviteMembershipDto } from './dtos/invite-membership.dto';
import { AcceptMembershipInvitationDto } from './dtos/accept-membership-invitation.dto';
import { AdminGuard } from './guards/admin.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { MembershipInvitationsService } from './membership-invitations.service';
import { requireCompanyId, SessionPrincipal } from './session-principal';

@ApiTags('Invitations')
@Controller()
export class MembershipInvitationsController {
  constructor(private readonly invitations: MembershipInvitationsService) {}

  @ApiOperation({ summary: 'Invite user to company' })
  @ApiCreatedResponse({ description: 'Invitation sent' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({
    description: 'User is already a member or account unavailable',
    type: ConflictResponseDto,
  })
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

  @ApiOperation({ summary: 'List pending invitations for current user' })
  @ApiOkResponse({ description: 'Pending invitations for current user' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @Get('auth/invitations')
  @UseGuards(SessionAuthGuard)
  list(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.invitations.listPending(principal.id);
  }

  @ApiOperation({ summary: 'Accept invitation by token' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid/expired invitation',
  })
  @Post('auth/invitations/accept')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  acceptToken(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Body() body: AcceptMembershipInvitationDto,
  ): Promise<void> {
    return this.invitations.acceptToken(principal.id, body.token);
  }

  @ApiOperation({ summary: 'Decline invitation' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Pending invitation not found' })
  @Post('auth/invitations/:membershipId/decline')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  decline(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ): Promise<void> {
    return this.invitations.decline(principal.id, membershipId);
  }

  @ApiOperation({ summary: 'Accept invitation by id' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Pending invitation not found' })
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
