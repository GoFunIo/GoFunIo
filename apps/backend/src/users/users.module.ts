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
import { AuthWorkflowExceptionFilter } from './auth-workflow.exception-filter';
import { PasswordRecoveryService } from './password-recovery.service';
import {
  PASSWORD_RECOVERY_STORE,
  TypeOrmPasswordRecoveryStore,
} from './password-recovery.store';
import { EmailChangeService } from './email-change.service';
import {
  EMAIL_CHANGE_STORE,
  TypeOrmEmailChangeStore,
} from './email-change.store';
import { CredentialAuthenticationService } from './credential-authentication.service';
import { CREDENTIAL_STORE, TypeOrmCredentialStore } from './credential.store';
import { PASSWORD_HASHER, ScryptPasswordHasher } from './password-hasher';
import { EmailRegistrationService } from './email-registration.service';
import {
  TypeOrmWorkspaceOwnerProvisioner,
  WORKSPACE_OWNER_PROVISIONER,
} from './workspace-owner-provisioner';

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
    EmailRegistrationService,
    TypeOrmWorkspaceOwnerProvisioner,
    {
      provide: WORKSPACE_OWNER_PROVISIONER,
      useExisting: TypeOrmWorkspaceOwnerProvisioner,
    },
    TypeOrmEmailVerificationStore,
    {
      provide: EMAIL_VERIFICATION_STORE,
      useExisting: TypeOrmEmailVerificationStore,
    },
    PasswordRecoveryService,
    TypeOrmPasswordRecoveryStore,
    {
      provide: PASSWORD_RECOVERY_STORE,
      useExisting: TypeOrmPasswordRecoveryStore,
    },
    EmailChangeService,
    TypeOrmEmailChangeStore,
    {
      provide: EMAIL_CHANGE_STORE,
      useExisting: TypeOrmEmailChangeStore,
    },
    CredentialAuthenticationService,
    TypeOrmCredentialStore,
    {
      provide: CREDENTIAL_STORE,
      useExisting: TypeOrmCredentialStore,
    },
    ScryptPasswordHasher,
    {
      provide: PASSWORD_HASHER,
      useExisting: ScryptPasswordHasher,
    },
    {
      provide: APP_FILTER,
      useClass: AuthWorkflowExceptionFilter,
    },
  ],
  exports: [UsersService, SessionsService, SessionAuthGuard, AdminGuard],
})
export class UsersModule {}
