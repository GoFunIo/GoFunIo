import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { DataSource, QueryFailedError } from 'typeorm';
import { UsersService } from './users.service';
import { generateToken, hashToken } from './token.util';
import {
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  EmailVerificationRequestedEvent,
} from './events/email-verification-requested.event';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from './events/password-reset-requested.event';
import { Company } from '../companies/companies.entity';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import { hashPassword, verifyPassword } from './password.util';
import {
  USER_EMAIL_CHANGE_REQUESTED_EVENT,
  UserEmailChangeRequestedEvent,
} from './events/user-email-change-requested.event';
import {
  clearExpiredEmailClaims,
  emailClaimInUse,
  lockEmailClaim,
} from './email-claim.util';

const UNIQUE_VIOLATION_CODE = '23505';

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const code = (err.driverError as { code?: string } | undefined)?.code;
  return code === UNIQUE_VIOLATION_CODE;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private eventEmitter: EventEmitter2,
    private config: ConfigService,
    private dataSource: DataSource,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async signup(email: string, password: string, origin?: string) {
    email = this.normalizeEmail(email);
    const result = await hashPassword(password);

    const ttlHours = this.config.get<number>(
      'VERIFICATION_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateToken(ttlHours);

    let user: User;
    try {
      user = await this.dataSource.transaction(async (manager) => {
        await lockEmailClaim(manager, email);
        await clearExpiredEmailClaims(manager, email);
        if (await emailClaimInUse(manager, email)) {
          throw new BadRequestException('Email already in use');
        }

        // placeholder until company profile filled in settings
        const company = manager.create(Company, { name: 'Moja firma' });
        const savedCompany = await manager.save(company);

        const newUser = manager.create(User, {
          companyId: savedCompany.id,
          email,
          password: result,
          role: MembershipRole.ADMIN,
          verificationTokenHash: tokenHash,
          verificationTokenExpiresAt: expiresAt,
        });

        return manager.save(newUser);
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Email already in use');
      }
      throw err;
    }

    this.eventEmitter.emit(
      EMAIL_VERIFICATION_REQUESTED_EVENT,
      new EmailVerificationRequestedEvent(user.id, {
        email: user.email,
        token,
        origin,
      }),
    );

    return user;
  }

  async signin(email: string, password: string) {
    const user = await this.usersService.findActiveByEmail(
      this.normalizeEmail(email),
    );

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await verifyPassword(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }

    await this.usersService.update(user.id, { lastLoginAt: new Date() });

    return user;
  }

  async signInWithGoogle(credential: string): Promise<User> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')!;

    let payload: TokenPayload | undefined;

    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new UnauthorizedException('Invalid Google token');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleId } = payload;
    const email = this.normalizeEmail(payload.email);

    const existingByGoogle =
      await this.usersService.findActiveByGoogleId(googleId);
    if (existingByGoogle) {
      await this.usersService.update(existingByGoogle.id, {
        lastLoginAt: new Date(),
      });
      return existingByGoogle;
    }

    const existingByEmail = await this.usersService.findActiveByEmail(email);
    if (existingByEmail) {
      if (existingByEmail.googleId && existingByEmail.googleId !== googleId) {
        throw new ConflictException('Google account conflict');
      }
      if (!existingByEmail.emailVerifiedAt) {
        throw new ConflictException('Verify email before linking Google');
      }
      if (!payload.email?.toLowerCase().endsWith('@gmail.com') && !payload.hd) {
        throw new ConflictException(
          'Sign in with password before linking Google',
        );
      }
      await this.usersService.update(existingByEmail.id, {
        googleId,
        lastLoginAt: new Date(),
      });
      existingByEmail.googleId = googleId;
      return existingByEmail;
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        await lockEmailClaim(manager, email);
        await clearExpiredEmailClaims(manager, email);
        const concurrentUser = await manager
          .createQueryBuilder(User, 'user')
          .innerJoinAndSelect('user.company', 'company')
          .where('user.googleId = :googleId', { googleId })
          .andWhere('company."deletedAt" IS NULL')
          .getOne();
        if (concurrentUser) return concurrentUser;
        if (await emailClaimInUse(manager, email)) {
          throw new ConflictException('Email already in use');
        }

        const company = manager.create(Company, { name: 'Moja firma' });
        const savedCompany = await manager.save(company);

        const newUser = manager.create(User, {
          companyId: savedCompany.id,
          email,
          password: null,
          googleId,
          firstName: payload.given_name ?? null,
          lastName: payload.family_name ?? null,
          role: MembershipRole.ADMIN,
          emailVerifiedAt: new Date(),
        });

        return manager.save(newUser);
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const concurrentUser =
          await this.usersService.findActiveByGoogleId(googleId);
        if (concurrentUser) {
          return concurrentUser;
        }
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async requestPasswordReset(email: string, origin?: string): Promise<void> {
    const user = await this.usersService.findActiveByEmail(
      this.normalizeEmail(email),
    );
    // silent no-op for missing email (anti-enumeration); verified + unverified allowed
    if (!user) {
      return;
    }

    const isFirstPassword = user.password == null;
    const ttlHours = this.config.get<number>(
      'PASSWORD_RESET_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateToken(ttlHours);

    await this.usersService.update(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: expiresAt,
    });

    this.eventEmitter.emit(
      PASSWORD_RESET_REQUESTED_EVENT,
      new PasswordResetRequestedEvent(
        user.id,
        { email: user.email, token, origin },
        ttlHours,
        isFirstPassword,
      ),
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const password = await hashPassword(newPassword);
    const consumed = await this.usersService.consumePasswordResetToken(
      tokenHash,
      password,
    );

    if (!consumed) {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async requestEmailChange(
    user: User,
    email: string,
    currentPassword: string,
    origin?: string,
  ): Promise<void> {
    if (!user.password) {
      throw new ConflictException('Set a password before changing email');
    }
    if (!(await verifyPassword(currentPassword, user.password))) {
      throw new UnauthorizedException('Invalid current password');
    }

    email = this.normalizeEmail(email);
    if (email === user.email) {
      throw new BadRequestException('Email unchanged');
    }
    const ttlHours = this.config.get<number>(
      'VERIFICATION_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateToken(ttlHours);
    try {
      const claimed = await this.usersService.claimEmailChange(
        user.id,
        user.password,
        email,
        tokenHash,
        expiresAt,
      );
      if (!claimed) {
        throw new UnauthorizedException('Current password changed');
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
    this.eventEmitter.emit(
      USER_EMAIL_CHANGE_REQUESTED_EVENT,
      new UserEmailChangeRequestedEvent({ email, token, origin }),
    );
  }

  async verifyEmailChange(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    try {
      if (!(await this.usersService.consumeEmailChangeToken(tokenHash))) {
        throw new BadRequestException('Invalid or expired token');
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async changePassword(
    user: User,
    currentPassword: string,
    newPassword: string,
  ): Promise<number> {
    if (!user.password) {
      throw new ConflictException('Use password reset to set a password');
    }
    if (!(await verifyPassword(currentPassword, user.password))) {
      throw new UnauthorizedException('Invalid current password');
    }
    if (await verifyPassword(newPassword, user.password)) {
      throw new BadRequestException('New password must be different');
    }

    const passwordVersion = await this.usersService.updatePassword(
      user.id,
      user.password,
      await hashPassword(newPassword),
    );
    if (passwordVersion === null) {
      throw new UnauthorizedException('Current password changed');
    }
    return passwordVersion;
  }
}
