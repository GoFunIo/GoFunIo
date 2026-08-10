import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { Company } from '../companies/companies.entity';
import { User } from './users.entity';
import { Membership } from './membership.entity';
import { SessionAuthGuard } from './guards/session-auth.guard';
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
import { GoogleAuthenticationService } from './google-authentication.service';
import {
  GOOGLE_AUTHENTICATION_STORE,
  TypeOrmGoogleAuthenticationStore,
} from './google-authentication.store';
import {
  GOOGLE_IDENTITY_VERIFIER,
  GoogleSdkIdentityVerifier,
} from './google-identity-verifier';
import { MembershipInvitationsController } from './membership-invitations.controller';
import { MembershipInvitationsService } from './membership-invitations.service';
import { FleetModule } from '../fleet/fleet.module';
import { UserProfileStore } from './user-profile.store';
import { UserProfilesService } from './user-profiles.service';
import { USER_PROFILES } from './user-profiles';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Membership]),
    FleetModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
  ],
  controllers: [
    AuthController,
    UserProfileController,
    CompanyUsersController,
    MembershipInvitationsController,
  ],
  providers: [
    UserProfileStore,
    UserProfilesService,
    { provide: USER_PROFILES, useExisting: UserProfilesService },
    SessionAuthGuard,
    AdminGuard,
    CompanyUsersService,
    MembershipInvitationsService,
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
    GoogleAuthenticationService,
    TypeOrmGoogleAuthenticationStore,
    {
      provide: GOOGLE_AUTHENTICATION_STORE,
      useExisting: TypeOrmGoogleAuthenticationStore,
    },
    GoogleSdkIdentityVerifier,
    {
      provide: GOOGLE_IDENTITY_VERIFIER,
      useExisting: GoogleSdkIdentityVerifier,
    },
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
  exports: [SessionsService, SessionAuthGuard, AdminGuard],
})
export class UsersModule {}
