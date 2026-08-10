import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
  Query,
  Session,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GoogleAuthDto } from './dtos/google-auth.dto';
import { GoogleLinkDto } from './dtos/google-link.dto';
import { SignupDto } from './dtos/signup.dto';
import { SigninDto } from './dtos/signin.dto';
import { VerifyEmailDto } from './dtos/verify-email.dto';
import { ResendVerificationDto } from './dtos/resend-verification.dto';
import { RequestPasswordResetDto } from './dtos/request-password-reset.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { Serialize } from '../interceptors/serialize.interceptor';
import { UserDto } from './dtos/user.dto';
import { EmailRegistrationService } from './email-registration.service';
import type { SessionData } from '../types/session.types';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import type { SessionPrincipal } from './session-principal';
import { SessionsService } from './sessions.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordRecoveryService } from './password-recovery.service';
import { EmailChangeService } from './email-change.service';
import { CredentialAuthenticationService } from './credential-authentication.service';
import type { CurrentUserView } from './current-user-view';
import type { UserAccount } from './user-account';
import { GoogleAuthenticationService } from './google-authentication.service';
import { SwitchCompanyDto } from './dtos/switch-company.dto';
import { USER_PROFILES, type UserProfiles } from './user-profiles';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly emailRegistration: EmailRegistrationService,
    private readonly sessions: SessionsService,
    private readonly emailVerification: EmailVerificationService,
    private readonly passwordRecovery: PasswordRecoveryService,
    private readonly emailChange: EmailChangeService,
    private readonly credentials: CredentialAuthenticationService,
    private readonly googleAuthentication: GoogleAuthenticationService,
    @Inject(USER_PROFILES) private readonly userProfiles: UserProfiles,
  ) {}

  @ApiOperation({ summary: 'Sign up with email and password' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Email already in use' })
  @Post('signup')
  @Serialize(UserDto)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signup(
    @Body() body: SignupDto,
    @Headers('origin') origin?: string,
  ): Promise<UserAccount> {
    return this.emailRegistration.register(body.email, body.password, origin);
  }

  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or email not verified',
  })
  @Post('signin')
  @Serialize(UserDto)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signin(
    @Body() body: SigninDto,
    @Session() session: SessionData,
  ): Promise<CurrentUserView> {
    const authenticated = await this.credentials.signin(
      body.email,
      body.password,
    );
    const principal = await this.sessions.establish(
      session,
      authenticated.account.id,
      authenticated.passwordVersion,
    );
    return {
      ...authenticated.account,
      companyId: principal.companyId,
      role: principal.role,
    };
  }

  @ApiOperation({ summary: 'Sign in with Google' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid Google identity' })
  @ApiConflictResponse({
    description: 'Google account conflict or explicit link required',
  })
  @Post('google')
  @Serialize(UserDto)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async googleSignIn(
    @Body() body: GoogleAuthDto,
    @Session() session: SessionData,
  ): Promise<CurrentUserView> {
    const account = await this.googleAuthentication.signin(body.credential);
    const principal = await this.sessions.establish(session, account.id);
    return {
      ...account,
      companyId: principal.companyId,
      role: principal.role,
    };
  }

  @ApiOperation({ summary: 'Link Google account to current user' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated or invalid credentials',
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Google account already linked' })
  @Post('google/link')
  @Serialize(UserDto)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  googleLink(
    @Body() body: GoogleLinkDto,
    @CurrentPrincipal() principal: SessionPrincipal,
  ): Promise<UserAccount> {
    return this.googleAuthentication.link(
      principal.id,
      body.credential,
      body.password,
    );
  }

  @ApiOperation({ summary: 'Sign out' })
  @ApiNoContentResponse()
  @Post('signout')
  @UseGuards(AllowedOriginGuard)
  @HttpCode(204)
  signout(@Session() session: SessionData): void {
    this.sessions.clear(session);
  }

  @ApiOperation({ summary: 'Get current user' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @Get('me')
  @Serialize(UserDto)
  @UseGuards(SessionAuthGuard)
  async getMe(
    @CurrentPrincipal() principal: SessionPrincipal,
  ): Promise<CurrentUserView> {
    const account = await this.userProfiles.get(principal.id);
    if (!account) throw new UnauthorizedException();
    return {
      ...account,
      companyId: principal.companyId,
      role: principal.role,
    };
  }

  @ApiOperation({ summary: 'List companies of current user' })
  @ApiOkResponse({ description: 'Companies of current user' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @Get('companies')
  @UseGuards(SessionAuthGuard)
  listCompanies(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.sessions.listCompanies(principal.id);
  }

  @ApiOperation({ summary: 'Switch active company' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Not a member of the company' })
  @Post('switch-company')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, AllowedOriginGuard)
  switchCompany(
    @Body() body: SwitchCompanyDto,
    @Session() session: SessionData,
    @CurrentPrincipal() principal: SessionPrincipal,
  ): Promise<void> {
    return this.sessions.switchCompany(session, principal.id, body.companyId);
  }

  @ApiOperation({ summary: 'Verify email address' })
  @ApiOkResponse({ description: 'Email verified' })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid/expired token',
  })
  @ApiConflictResponse({ description: 'Sign out before verifying email' })
  @Get('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(
    @Query() query: VerifyEmailDto,
    @Session() session: SessionData,
  ): Promise<{ verified: true }> {
    if (session.userId) {
      throw new ConflictException('Sign out before verifying email');
    }
    const userId = await this.emailVerification.verify(query.token);
    await this.sessions.establish(session, userId);
    return { verified: true };
  }

  @ApiOperation({ summary: 'Confirm email change' })
  @ApiOkResponse({ description: 'Email change confirmed' })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid/expired token',
  })
  @Post('verify-email-change')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmailChange(
    @Body() body: VerifyEmailDto,
  ): Promise<{ verified: true }> {
    await this.emailChange.confirm(body.token);
    return { verified: true };
  }

  @ApiOperation({ summary: 'Resend verification email' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @Post('resend-verification')
  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @HttpCode(204)
  async resendVerification(
    @Body() body: ResendVerificationDto,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    await this.emailVerification.resend(body.email, origin);
  }

  @ApiOperation({ summary: 'Request password reset email' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @Post('forgot-password')
  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @HttpCode(204)
  async forgotPassword(
    @Body() body: RequestPasswordResetDto,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    await this.passwordRecovery.request(body.email, origin);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid/expired token',
  })
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.passwordRecovery.reset(body.token, body.password);
  }
}
