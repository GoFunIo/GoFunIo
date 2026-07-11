import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Session,
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
import { CurrentUser } from './decorators/current-user.decorator';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';

@Controller('auth')
export class UsersController {
  constructor(private authService: AuthService) {}

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
    session.userId = user.id;
    session.passwordVersion = user.passwordVersion;
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
    session.userId = user.id;
    session.passwordVersion = user.passwordVersion;
    return user;
  }

  @Post('signout')
  @UseGuards(AllowedOriginGuard)
  @HttpCode(204)
  signout(@Session() session: SessionData): void {
    session.userId = null;
    session.passwordVersion = null;
  }

  @Get('me')
  @Serialize(UserDto)
  @UseGuards(SessionAuthGuard)
  getMe(@CurrentUser() user: User): User {
    return user;
  }

  @Get('verify-email')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(
    @Query() query: VerifyEmailDto,
  ): Promise<{ verified: true }> {
    await this.authService.verifyEmail(query.token);
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
    await this.authService.resendVerification(body.email, origin);
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
