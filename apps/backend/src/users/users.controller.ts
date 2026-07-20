import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Session,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { User } from './users.entity';
import { GoogleAuthDto } from './dtos/google-auth.dto';
import { SignupDto } from './dtos/signup.dto';
import { SigninDto } from './dtos/signin.dto';
import { VerifyEmailDto } from './dtos/verify-email.dto';
import { ResendVerificationDto } from './dtos/resend-verification.dto';
import { RequestPasswordResetDto } from './dtos/request-password-reset.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { Serialize } from '../interceptors/serialize.interceptor';
import { UserDto } from './dtos/user.dto';
import { AuthService } from './auth.service';
import type { SessionData } from '../types/session.types';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import type { SessionPrincipal } from './session-principal';
import { SessionsService } from './sessions.service';
import { UsersService } from './users.service';
import { EmailVerificationService } from './email-verification.service';

@Controller('auth')
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  @Post('signup')
  @Serialize(UserDto)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signup(
    @Body() body: SignupDto,
    @Headers('origin') origin?: string,
  ): Promise<User> {
    return this.authService.signup(body.email, body.password, origin);
  }

  @Post('signin')
  @Serialize(UserDto)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async signin(
    @Body() body: SigninDto,
    @Session() session: SessionData,
  ): Promise<User> {
    const user = await this.authService.signin(body.email, body.password);
    await this.sessions.establish(session, user.id);
    return user;
  }

  @Post('google')
  @Serialize(UserDto)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async googleSignIn(
    @Body() body: GoogleAuthDto,
    @Session() session: SessionData,
  ): Promise<User> {
    const user = await this.authService.signInWithGoogle(body.credential);
    await this.sessions.establish(session, user.id);
    return user;
  }

  @Post('signout')
  @UseGuards(AllowedOriginGuard)
  @HttpCode(204)
  signout(@Session() session: SessionData): void {
    this.sessions.clear(session);
  }

  @Get('me')
  @Serialize(UserDto)
  @UseGuards(SessionAuthGuard)
  async getMe(@CurrentPrincipal() principal: SessionPrincipal): Promise<User> {
    const user = await this.users.findActiveById(principal.id);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Get('verify-email')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(
    @Query() query: VerifyEmailDto,
  ): Promise<{ verified: true }> {
    await this.emailVerification.verify(query.token);
    return { verified: true };
  }

  @Post('verify-email-change')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmailChange(
    @Body() body: VerifyEmailDto,
  ): Promise<{ verified: true }> {
    await this.authService.verifyEmailChange(body.token);
    return { verified: true };
  }

  @Post('resend-verification')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @HttpCode(204)
  async resendVerification(
    @Body() body: ResendVerificationDto,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    await this.emailVerification.resend(body.email, origin);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @HttpCode(204)
  async forgotPassword(
    @Body() body: RequestPasswordResetDto,
    @Headers('origin') origin?: string,
  ): Promise<void> {
    await this.authService.requestPasswordReset(body.email, origin);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(body.token, body.password);
  }
}
