import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { Company } from '../companies/companies.entity';
import { User } from './users.entity';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';
import { UserProfileController } from './user-profile.controller';
import { AdminGuard } from './guards/admin.guard';
import { CompanyUsersController } from './company-users.controller';
import { CompanyUsersService } from './company-users.service';
import { SessionsService } from './sessions.service';
import {
  SESSION_USER_READER,
  TypeOrmSessionUserReader,
} from './session-user-reader';
import { EmailVerificationService } from './email-verification.service';
import {
  EMAIL_VERIFICATION_STORE,
  TypeOrmEmailVerificationStore,
} from './email-verification.store';
import { EmailVerificationExceptionFilter } from './email-verification.exception-filter';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
  ],
  controllers: [UsersController, UserProfileController, CompanyUsersController],
  providers: [
    UsersService,
    AuthService,
    SessionAuthGuard,
    AllowedOriginGuard,
    AdminGuard,
    CompanyUsersService,
    SessionsService,
    TypeOrmSessionUserReader,
    {
      provide: SESSION_USER_READER,
      useExisting: TypeOrmSessionUserReader,
    },
    EmailVerificationService,
    TypeOrmEmailVerificationStore,
    {
      provide: EMAIL_VERIFICATION_STORE,
      useExisting: TypeOrmEmailVerificationStore,
    },
    {
      provide: APP_FILTER,
      useClass: EmailVerificationExceptionFilter,
    },
  ],
  exports: [UsersService, SessionsService, SessionAuthGuard, AdminGuard],
})
export class UsersModule {}
